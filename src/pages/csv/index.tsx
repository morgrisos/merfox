import { useState, useEffect } from 'react';
import { useRunHistory } from '../../hooks/useRunHistory';

export const CsvManager = () => {
    const { history } = useRunHistory();
    const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [runPath, setRunPath] = useState<string>('');

    // If report tab is active but no run selected, try to select the first one
    if (activeTab === 'report' && !selectedRunId && history.length > 0) {
        setSelectedRunId(history[0].id);
    }

    const selectedRun = history.find(r => r.id === selectedRunId);

    // Fetch path when run selected
    useEffect(() => {
        if (selectedRunId) {
            fetch(`/api/runs/${selectedRunId}/path`)
                .then(res => res.json())
                .then(data => setRunPath(data.path))
                .catch(() => setRunPath(''));
        } else {
            setRunPath('');
        }
    }, [selectedRunId]);

    const handleDownload = (type: 'raw' | 'log' | 'amazon' | 'failed') => {
        if (!selectedRunId) return;
        window.location.href = `/api/runs/${selectedRunId}/files/${type}`;
    };

    const handleReveal = async () => {
        if (!selectedRunId) return;
        await fetch(`/api/runs/${selectedRunId}/reveal`, { method: 'POST' });
    };

    const copyPath = () => {
        if (runPath) navigator.clipboard.writeText(runPath);
    };

    return (
        <div className="flex flex-col h-full relative">
            <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-surface-light/80 dark:bg-[#111418]/90 backdrop-blur-md px-4 sm:px-10 py-3 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-xl">table_view</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">CSV管理 & レポート</h2>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-[1200px] mx-auto flex flex-col gap-6">

                    {/* Tabs */}
                    <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6">
                        <button
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            実行履歴
                        </button>
                        <button
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'report' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                            onClick={() => setActiveTab('report')}
                        >
                            レポート & 分析
                        </button>
                    </div>

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="bg-surface-light dark:bg-[#1a2430] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-[#111418] text-slate-500 dark:text-[#9da8b9] border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">実行日時 / ID</th>
                                            <th className="px-6 py-4 font-bold">ターゲット</th>
                                            <th className="px-6 py-4 font-bold">ステータス</th>
                                            <th className="px-6 py-4 font-bold">取得実績 (成功/除外/失敗)</th>
                                            <th className="px-6 py-4 font-bold text-right">アクション</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                                                    実行履歴がありません。「スクレイパー」画面から抽出を実行してください。
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map(run => (
                                                <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white">{new Date(run.date).toLocaleString()}</span>
                                                            <span className="text-xs text-slate-400 font-mono">ID: {run.id.slice(0, 8)}...</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-xs truncate">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold uppercase text-slate-500">{run.platform} ({run.mode})</span>
                                                            <span className="truncate text-slate-700 dark:text-slate-300" title={run.targetUrl}>{run.targetUrl}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${run.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                            run.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                run.status === 'running' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse' :
                                                                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                            }`}>
                                                            {run.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3 font-mono text-xs">
                                                            <span className="text-green-600 dark:text-green-400 font-bold">{run.stats.success} OK</span>
                                                            <span className="text-slate-400">/</span>
                                                            <span className="text-slate-500">{run.stats.excluded} EXC</span>
                                                            <span className="text-slate-400">/</span>
                                                            <span className="text-red-500">{run.stats.failed} ERR</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => { setSelectedRunId(run.id); setActiveTab('report'); }}
                                                            className="text-primary font-bold hover:underline"
                                                        >
                                                            詳細レポート
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Report Tab */}
                    {activeTab === 'report' && (
                        <div className="flex flex-col gap-6">
                            {!selectedRun ? (
                                <div className="p-10 text-center bg-surface-light dark:bg-[#1a2430] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-slate-500">レポートを表示する実行履歴を選択してください。</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">実行レポート: {new Date(selectedRun.date).toLocaleString()}</h3>
                                            <p className="text-sm text-slate-500 font-mono">ID: {selectedRun.id}</p>

                                            {/* Path Display */}
                                            {runPath && (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 dark:bg-[#111418] rounded border border-slate-200 dark:border-slate-700 max-w-2xl">
                                                    <span className="material-symbols-outlined text-slate-400 text-sm">folder</span>
                                                    <code className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate flex-1">{runPath}</code>
                                                    <button onClick={copyPath} className="text-slate-400 hover:text-primary" title="パスをコピー">
                                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                                    </button>
                                                    <button onClick={handleReveal} className="text-slate-400 hover:text-primary" title="Finderで表示">
                                                        <span className="material-symbols-outlined text-sm">folder_open</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDownload('raw')}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                <span className="material-symbols-outlined text-base">download</span> Raw CSV
                                            </button>
                                            <button
                                                onClick={() => handleDownload('log')}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                                <span className="material-symbols-outlined text-base">description</span> Log
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                                                失敗 / 除外の主な理由
                                            </h4>
                                            {/* Mock Data Visualization */}
                                            <div className="space-y-4">
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-slate-700 dark:text-slate-300">ショップ除外 (個人以外)</span>
                                                        <span className="font-mono text-slate-500">12件</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                                        <div className="bg-slate-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-slate-700 dark:text-slate-300">商品詳細ページ取得エラー (Timeout)</span>
                                                        <span className="font-mono text-red-500">5件</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-slate-700 dark:text-slate-300">キーワード不一致 (NGワード)</span>
                                                        <span className="font-mono text-slate-500">3件</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                                        <div className="bg-slate-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-64 overflow-y-auto">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">エラーURL一覧</h4>
                                            <div className="flex flex-col gap-2">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <div key={i} className="flex gap-2 items-start text-xs p-2 rounded bg-slate-50 dark:bg-[#101822] border border-slate-100 dark:border-slate-700">
                                                        <span className="material-symbols-outlined text-red-500 text-sm flex-shrink-0">link_off</span>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <a href="#" className="truncate text-blue-500 hover:underline">https://jp.mercari.com/item/m{12345678900 + i}</a>
                                                            <span className="text-slate-500">Error: Connection Timeout (5000ms)</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
