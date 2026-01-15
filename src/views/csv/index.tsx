import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RunRecord } from '../../types';

export const CsvManager = () => {
    const [history, setHistory] = useState<RunRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'history' | 'report'>('history');
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

    useEffect(() => {
        fetchRuns();
        const interval = setInterval(fetchRuns, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await axios.get('/api/runs');
            setHistory(res.data);
            
            // Auto select if none selected
            setSelectedRunId(prev => {
                if (!prev && res.data.length > 0) return res.data[0].id;
                return prev;
            });
        } catch (e) {
            console.error('Failed to fetch runs', e);
        }
    };

    const selectedRun = history.find(r => r.id === selectedRunId);

    const handleDownload = (type: string) => {
        if (!selectedRunId) return;
        window.location.href = `/api/runs/${selectedRunId}/files/${type}`; 
    };

    const handleReveal = async () => {
        if (!selectedRun || !selectedRun.path) return;
        if (window.electron && window.electron.openFolder) {
            await window.electron.openFolder(selectedRun.path);
        }
    };

    const copyPath = () => {
        if (selectedRun?.path) navigator.clipboard.writeText(selectedRun.path);
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
                                            <th className="px-6 py-4 font-bold">取得実績 (成功/失敗)</th>
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
                                                <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-colors cursor-pointer" onClick={() => setSelectedRunId(run.id)}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white">{run.date}</span>
                                                            <span className="text-xs text-slate-400 font-mono">ID: {run.id ? run.id.slice(0, 8) : '...'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-[200px] truncate">
                                                        {run.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {run.stats && run.stats.failed > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold">
                                                                失敗あり
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold">
                                                                成功
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-slate-400">成功 (Amazon TSV)</span>
                                                                <span className="font-bold">{run.stats?.success || 0}</span>
                                                            </div>
                                                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-slate-400">失敗</span>
                                                                <span className={`font-bold ${(run.stats?.failed || 0) > 0 ? 'text-red-500' : ''}`}>{run.stats?.failed || 0}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedRunId(run.id); setActiveTab('report'); }}
                                                            className="text-primary hover:underline text-xs font-bold"
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
                                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-[#111418] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    左側の履歴から実行IDを選択してください。
                                </div>
                            ) : (
                                <>
                                    {/* Summary Card */}
                                    <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedRun.name}</h3>
                                                {selectedRun.stats?.currentRunDir && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">Active</span>}
                                            </div>
                                            <p className="text-sm text-slate-500 font-mono">ID: {selectedRun.id}</p>

                                            {/* Path Display */}
                                            {selectedRun.path && (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 dark:bg-[#111418] rounded border border-slate-200 dark:border-slate-700 max-w-2xl">
                                                    <span className="material-symbols-outlined text-slate-400 text-sm">folder</span>
                                                    <code className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate flex-1">{selectedRun.path}</code>
                                                    <button onClick={copyPath} className="text-slate-400 hover:text-primary" title="パスをコピー">
                                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                                    </button>
                                                    <button onClick={handleReveal} className="text-slate-400 hover:text-primary" title="Finderで表示">
                                                        <span className="material-symbols-outlined text-sm">folder_open</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Failure Reasons Chart */}
                                        <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                                                失敗 / 除外の主な理由 (Top Reasons)
                                            </h4>
                                            
                                            {selectedRun.failureReasons && selectedRun.failureReasons.length > 0 ? (
                                                <div className="space-y-4">
                                                    {selectedRun.failureReasons.map((item, idx) => {
                                                        const totalFailed = selectedRun.stats?.failed || 1;
                                                        const percentage = Math.min(100, Math.round((item.count / totalFailed) * 100));
                                                        return (
                                                            <div key={idx}>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-slate-700 dark:text-slate-300 truncate pr-2" title={item.reason}>{item.reason}</span>
                                                                    <span className="font-mono text-slate-500">{item.count}件</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full">
                                                                    <div className="bg-slate-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 text-slate-500 text-sm">
                                                    失敗データはありません。
                                                </div>
                                            )}
                                        </div>

                                        {/* Failed URLs List */}
                                        <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-64 overflow-y-auto">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">エラーURL一覧 (Top 20)</h4>
                                            
                                            {selectedRun.failedUrls && selectedRun.failedUrls.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                    {selectedRun.failedUrls.map((fail, idx) => (
                                                        <div key={idx} className="flex gap-2 items-start text-xs p-2 rounded bg-slate-50 dark:bg-[#101822] border border-slate-100 dark:border-slate-700">
                                                            <span className="material-symbols-outlined text-red-500 text-sm flex-shrink-0">link_off</span>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <a href={fail.url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-500 hover:underline">{fail.title || fail.url}</a>
                                                                <span className="text-slate-500">{fail.reason}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 text-slate-500 text-sm">
                                                    エラーURLはありません。
                                                </div>
                                            )}
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
