import { useState, useRef, useEffect } from 'react';
import { useRunHistory } from '../../hooks/useRunHistory';
import { RunRecord, LogEntry } from '../../types';

// [P2.4] Job Interface
interface WatchJob {
    id: string;
    targetUrl: string;
    isEnabled: boolean;
    intervalMinutes: number;
    lastRunAt: string | null;
    nextRunAt: string | null;
    stats: { totalRuns: number; totalItemsFound: number };
}

export default function Scraper() {
    const { addRecord, updateRecord } = useRunHistory();
    const [targetUrl, setTargetUrl] = useState('https://jp.mercari.com/search?keyword=vintage%20camera&status=on_sale');
    const [isValidating, setIsValidating] = useState(false);
    const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, excluded: 0 });

    // Config States
    const [mode, setMode] = useState<'onetime' | 'watch' | 'bulk'>('onetime');
    const [excludeShops, setExcludeShops] = useState(true);
    const [excludeKeywords, setExcludeKeywords] = useState('');
    const [showNgModal, setShowNgModal] = useState(false);
    // const [stopCondition, setStopCondition] = useState<'count' | 'time' | 'manual'>('count');
    const [stopLimit] = useState(50);
    const [watchInterval, setWatchInterval] = useState(30);

    // Watch Job State
    const [activeJob, setActiveJob] = useState<WatchJob | null>(null);

    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Fetch Jobs on Mount & when URL changes
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch('/api/watch/jobs');
                const jobs: WatchJob[] = await res.json();
                const matched = jobs.find(j => j.targetUrl === targetUrl);
                setActiveJob(matched || null);
            } catch (e) {
                console.error('Failed to fetch jobs', e);
            }
        };
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000); // Poll for status updates
        return () => clearInterval(interval);
    }, [targetUrl]);

    const handleCheckUrl = () => {
        setIsValidating(true);
        setTimeout(() => {
            setIsValidating(false);
            setIsValidUrl(targetUrl.includes('mercari.com') || targetUrl.includes('shopee'));
        }, 800);
    };

    const addLog = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
        const entry: LogEntry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            message
        };
        setLogs(prev => [...prev, entry]);
        return entry;
    };

    // Watch Actions
    const handleStartWatch = async () => {
        if (activeJob && !activeJob.isEnabled) {
            // Resume/Enable
            await fetch(`/api/watch/jobs/${activeJob.id}/enable`, { method: 'POST' });
        } else if (!activeJob) {
            // Create New
            await fetch('/api/watch/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUrl,
                    intervalMinutes: watchInterval,
                    name: `Watch: ${targetUrl.slice(0, 20)}...`
                })
            });
        }
        // State update via poll
    };

    const handleStopWatch = async () => {
        if (activeJob) {
            await fetch(`/api/watch/jobs/${activeJob.id}/disable`, { method: 'POST' });
        }
    };

    const startTestRun = async () => {
        if (!isValidUrl && targetUrl) handleCheckUrl();

        const runId = crypto.randomUUID();
        const newRecord: RunRecord = {
            id: runId,
            date: new Date().toISOString(),
            status: 'running',
            targetUrl,
            platform: targetUrl.includes('shopee') ? 'shopee' : 'mercari',
            mode,
            stats: { total: 0, success: 0, failed: 0, excluded: 0 },
            logs: [],
            failureReasons: [],
            failedUrls: []
        };

        addRecord(newRecord);
        setIsRunning(true);
        setLogs([]);
        setStats({ total: 0, success: 0, failed: 0, excluded: 0 });
        setProgress(0);

        // API Call to Start Run
        try {
            const res = await fetch('/api/run/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId,
                    mode,
                    targetUrl,
                    config: {
                        stopLimit: 20, // Test run fixed limit
                        excludeShops,
                        excludeKeywords
                    }
                })
            });

            if (!res.ok) throw new Error('Failed to start run');

            // Setup SSE
            const eventSource = new EventSource(`/api/run/stream?runId=${runId}`);

            eventSource.addEventListener('log', (e) => {
                const data = JSON.parse(e.data);
                addLog(data.message, data.level);
            });

            eventSource.addEventListener('stats', (e) => {
                const data = JSON.parse(e.data);
                setStats(prev => ({ ...prev, ...data }));
            });

            eventSource.addEventListener('progress', (e) => {
                const data = JSON.parse(e.data);
                setProgress(data.percentage);
            });

            eventSource.addEventListener('done', (e) => {
                const data = JSON.parse(e.data);
                setIsRunning(false);
                eventSource.close();

                if (data.success) {
                    addLog('実行完了 (Success)', 'success');
                    updateRecord(runId, { status: 'completed', stats: data.summary });
                } else {
                    addLog(`実行失敗: ${data.error}`, 'error');
                    updateRecord(runId, { status: 'failed' });
                }
            });

            eventSource.onerror = (e) => {
                console.error('SSE Error', e);
            };

        } catch (e) {
            console.error(e);
            addLog(`起動エラー: ${(e as Error).message}`, 'error');
            setIsRunning(false);
        }
    };

    const handleStop = async () => {
        if (!isRunning) return;
        try {
            await fetch('/api/run/stop', { method: 'POST' });
            addLog('停止リクエストを送信しました...', 'warn');
        } catch (e) {
            console.error(e);
            addLog('停止リクエスト失敗', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-surface-light/80 dark:bg-[#111418]/90 backdrop-blur-md px-4 sm:px-10 py-3 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-xl">bolt</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">スクレイパー (抽出実行)</h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

                    {/* 1. Presets */}
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        <button onClick={() => setMode('onetime')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${mode === 'onetime' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary'}`}>
                            <span className="material-symbols-outlined text-base">star</span>
                            初心者向けプリセット
                        </button>
                        <button onClick={() => setMode('watch')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${mode === 'watch' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary'}`}>
                            <span className="material-symbols-outlined text-base">visibility</span>
                            Watchモード (新着監視)
                        </button>
                        <button disabled title="準備中" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60">
                            <span className="material-symbols-outlined text-base">layers</span>
                            一括大量抽出 (準備中)
                        </button>
                    </div>

                    {/* 2. Target URL */}
                    <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                        <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">link</span>
                            ターゲットURL (検索結果ページ)
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                <input
                                    type="text"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="https://jp.mercari.com/search?..."
                                />
                                {isValidUrl === true && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 flex items-center gap-1 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">
                                        <span className="material-symbols-outlined text-sm">check_circle</span> OK
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleCheckUrl}
                                disabled={isValidating}
                                className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 min-w-[100px] flex items-center justify-center"
                            >
                                {isValidating ? <span className="material-symbols-outlined animate-spin">sync</span> : '確認'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 3. Config (Left Column) */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            {/* Filters & Mode */}
                            <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-slate-400">tune</span>
                                    抽出・フィルタ設定
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-3">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">実行モード設定</label>
                                        <div className="flex flex-col gap-2">
                                            <div className={`p-3 rounded-lg border cursor-pointer transition-all ${mode === 'onetime' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`} onClick={() => setMode('onetime')}>
                                                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                                                    <span className="material-symbols-outlined text-sm">bolt</span> 通常実行 (1回)
                                                </div>
                                            </div>
                                            <div className={`p-3 rounded-lg border cursor-pointer transition-all ${mode === 'watch' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`} onClick={() => setMode('watch')}>
                                                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                                                    <span className="material-symbols-outlined text-sm">schedule</span> Watchモード (新着監視)
                                                </div>
                                                {mode === 'watch' && (
                                                    <div className="mt-2">
                                                        <select
                                                            value={watchInterval}
                                                            onChange={(e) => setWatchInterval(Number(e.target.value))}
                                                            className="w-full text-sm rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-[#101822] p-2 text-slate-900 dark:text-white"
                                                            disabled={!!activeJob}
                                                        >
                                                            <option value={10}>10分ごとにチェック</option>
                                                            <option value={25}>25分ごとにチェック</option>
                                                            <option value={30}>30分ごとにチェック</option>
                                                            <option value={60}>60分ごとにチェック</option>
                                                        </select>
                                                        {activeJob && (
                                                            <p className="text-xs text-green-600 mt-1">※ 稼働中のため変更不可 (再作成してください)</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">フィルタ条件</label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={excludeShops} onChange={(e) => setExcludeShops(e.target.checked)} className="rounded border-slate-300 text-primary focus:ring-primary" />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">ショップを除外 (個人以外)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">送料込みのみ</span>
                                            </label>
                                            <button onClick={() => setShowNgModal(true)} className="mt-1 text-sm text-red-500 font-bold hover:underline py-1 text-left flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">block</span>
                                                NGワード設定...
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Output & Execution (Right Column) */}
                        <div className="flex flex-col gap-6">
                            {mode === 'watch' ? (
                                <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 sticky top-24">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">campaign</span>
                                        Watch監視コントロール
                                    </h3>

                                    {activeJob ? (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold">ステータス</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${activeJob.isEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                                    {activeJob.isEnabled ? '稼働中' : '停止中'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mb-1">次回: {new Date(activeJob.nextRunAt || '').toLocaleTimeString()}</p>
                                            <p className="text-xs text-slate-500 mb-4">実行回数: {activeJob.stats.totalRuns}回</p>

                                            {activeJob.isEnabled ? (
                                                <button onClick={handleStopWatch} className="w-full py-2 bg-red-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors">
                                                    監視を停止
                                                </button>
                                            ) : (
                                                <button onClick={handleStartWatch} className="w-full py-2 bg-green-100 text-green-600 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors">
                                                    監視を再開
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                                            <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">このURLの監視ジョブはまだありません</p>
                                            <button onClick={handleStartWatch} className="w-full py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all">
                                                <span className="material-symbols-outlined align-middle mr-1">play_circle</span>
                                                監視ジョブを作成して開始
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 sticky top-24">
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 font-bold mb-1">
                                            <span className="material-symbols-outlined text-sm align-bottom mr-1">info</span>
                                            実行前の確認
                                        </p>
                                        <p className="text-xs text-yellow-600 dark:text-yellow-500 leading-relaxed">
                                            大量のアクセスが発生します。まずは「テスト実行」で動作を確認してから本番実行してください。
                                        </p>
                                    </div>
                                    <button
                                        onClick={startTestRun}
                                        disabled={isRunning}
                                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined">play_circle</span>
                                        テスト実行 (20件)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 5. In-Progress Panel */}
                    {(isRunning || logs.length > 0) && (
                        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0d1117] border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 md:px-8 max-h-[40vh] flex flex-col">
                            <div className="max-w-[1200px] w-full mx-auto flex flex-col h-full gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                                        <span className="font-bold text-slate-900 dark:text-white">{isRunning ? '実行中...' : '待機中 / 完了'}</span>
                                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-green-600 dark:text-green-400 font-mono">成功: {stats.success}</span>
                                            <span className="text-red-500 font-mono">失敗: {stats.failed}</span>
                                            <span className="text-slate-500 font-mono">除外: {stats.excluded}</span>
                                            <span className="font-bold text-slate-900 dark:text-white font-mono">合計: {stats.total} / {stopLimit}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isRunning && (
                                            <button onClick={handleStop} className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-bold">
                                                <span className="material-symbols-outlined text-sm">stop_circle</span>
                                                停止
                                            </button>
                                        )}
                                        <button onClick={() => setLogs([])} disabled={isRunning} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                {/* Logs Area */}
                                <div className="flex-1 overflow-y-auto font-mono text-xs bg-slate-50 dark:bg-[#161b22] p-4 rounded-lg border border-slate-200 dark:border-slate-700 min-h-[120px]">
                                    {logs.map((log, index) => (
                                        <div key={index} className="mb-1 flex gap-2">
                                            <span className="text-slate-400">[{log.timestamp}]</span>
                                            <span className={`font-bold ${log.level === 'info' ? 'text-blue-500' : log.level === 'warn' ? 'text-yellow-500' : log.level === 'error' ? 'text-red-500' : 'text-green-500'}`}>{log.level.toUpperCase()}</span>
                                            <span className="text-slate-700 dark:text-slate-300">{log.message}</span>
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* NG Words Modal */}
            {showNgModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e2329] p-6 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">NGワード設定</h3>
                        <textarea
                            className="w-full h-32 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#101822] text-slate-900 dark:text-white text-sm"
                            placeholder="除外したいキーワードをカンマ区切りで入力..."
                            value={excludeKeywords}
                            onChange={(e) => setExcludeKeywords(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowNgModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold">キャンセル</button>
                            <button onClick={() => setShowNgModal(false)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
