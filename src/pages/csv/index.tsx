import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">ファイル管理</h1>
                        <p className="text-app-text-muted text-base font-normal leading-normal mt-2">
                            CSV/TSVファイルの管理とレポート表示
                        </p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="border-b border-app-border flex gap-6 mb-6">
                <button
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-app-text-muted hover:text-white'}`}
                    onClick={() => setActiveTab('history')}
                >
                    実行履歴
                </button>
                <button
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'report' ? 'border-primary text-primary' : 'border-transparent text-app-text-muted hover:text-white'}`}
                    onClick={() => setActiveTab('report')}
                >
                    レポート & 分析
                </button>
            </div>

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-app-element text-app-text-muted border-b border-app-border">
                                <tr>
                                    <th className="px-6 py-4 font-bold">実行日時 / ID</th>
                                    <th className="px-6 py-4 font-bold">ターゲット</th>
                                    <th className="px-6 py-4 font-bold">ステータス</th>
                                    <th className="px-6 py-4 font-bold">取得実績 (成功/除外/失敗)</th>
                                    <th className="px-6 py-4 font-bold text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-app-border text-white">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-app-text-muted">
                                            実行履歴がありません。「新規リサーチ」画面から抽出を実行してください。
                                        </td>
                                    </tr>
                                ) : (
                                    history.map(run => (
                                        <tr key={run.id} className="hover:bg-app-element transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white">{new Date(run.date).toLocaleString()}</span>
                                                    <span className="text-xs text-app-text-muted font-mono">ID: {run.id.slice(0, 8)}...</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs truncate">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase text-app-text-muted">{run.platform} ({run.mode})</span>
                                                    <span className="truncate text-white" title={run.targetUrl}>{run.targetUrl}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${run.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    run.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        run.status === 'running' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse' :
                                                            'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                                    }`}>
                                                    {run.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 font-mono text-xs">
                                                    <span className="text-green-400 font-bold">{run.stats.success} OK</span>
                                                    <span className="text-app-text-muted">/</span>
                                                    <span className="text-app-text-muted">{run.stats.excluded} EXC</span>
                                                    <span className="text-app-text-muted">/</span>
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
                        <div className="p-10 text-center bg-app-surface rounded-xl border border-dashed border-app-border">
                            <p className="text-app-text-muted">レポートを表示する実行履歴を選択してください。</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-app-surface p-6 rounded-xl border border-app-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-bold text-white mb-1">実行レポート: {new Date(selectedRun.date).toLocaleString()}</h3>
                                    <p className="text-sm text-app-text-muted font-mono">ID: {selectedRun.id}</p>

                                    {/* Path Display */}
                                    {runPath && (
                                        <div className="flex items-center gap-2 mt-2 p-2 bg-app-element rounded border border-app-border max-w-2xl">
                                            <span className="material-symbols-outlined text-app-text-muted text-sm">folder</span>
                                            <code className="text-xs font-mono text-app-text-muted truncate flex-1">{runPath}</code>
                                            <button onClick={copyPath} className="text-app-text-muted hover:text-primary" title="パスをコピー">
                                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                            </button>
                                            <button onClick={handleReveal} className="text-app-text-muted hover:text-primary" title="Finderで表示">
                                                <span className="material-symbols-outlined text-sm">folder_open</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDownload('raw')}
                                        className="flex items-center gap-2 px-4 py-2 bg-app-element rounded-lg text-sm font-bold text-white hover:bg-gray-700 transition-colors">
                                        <span className="material-symbols-outlined text-base">download</span> Raw CSV
                                    </button>
                                    <button
                                        onClick={() => handleDownload('log')}
                                        className="flex items-center gap-2 px-4 py-2 bg-app-element rounded-lg text-sm font-bold text-white hover:bg-gray-700 transition-colors">
                                        <span className="material-symbols-outlined text-base">description</span> Log
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-app-surface p-6 rounded-xl border border-app-border shadow-sm">
                                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                                        失敗 / 除外の主な理由
                                    </h4>
                                    {/* Mock Data Visualization */}
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white">ショップ除外 (個人以外)</span>
                                                <span className="font-mono text-app-text-muted">12件</span>
                                            </div>
                                            <div className="w-full bg-gray-700 h-2 rounded-full">
                                                <div className="bg-gray-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white">商品詳細ページ取得エラー (Timeout)</span>
                                                <span className="font-mono text-red-500">5件</span>
                                            </div>
                                            <div className="w-full bg-gray-700 h-2 rounded-full">
                                                <div className="bg-red-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white">キーワード不一致 (NGワード)</span>
                                                <span className="font-mono text-app-text-muted">3件</span>
                                            </div>
                                            <div className="w-full bg-gray-700 h-2 rounded-full">
                                                <div className="bg-gray-500 h-2 rounded-full" style={{ width: '8%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-app-surface p-6 rounded-xl border border-app-border shadow-sm h-64 overflow-y-auto">
                                    <h4 className="text-sm font-bold text-white mb-4">エラーURL一覧</h4>
                                    <div className="flex flex-col gap-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="flex gap-2 items-start text-xs p-2 rounded bg-app-element border border-app-border">
                                                <span className="material-symbols-outlined text-red-500 text-sm flex-shrink-0">link_off</span>
                                                <div className="flex flex-col overflow-hidden">
                                                    <a href="#" className="truncate text-blue-400 hover:underline">https://jp.mercari.com/item/m{12345678900 + i}</a>
                                                    <span className="text-app-text-muted">Error: Connection Timeout (5000ms)</span>
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
    );
};

CsvManager.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;

export default CsvManager;
