import { useState, useEffect } from 'react';
import { RunRecord } from '../../types';

export const Dashboard = () => {
    const [latestRuns, setLatestRuns] = useState<RunRecord[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const fetchRuns = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/runs?limit=10');
            const data = await res.json();
            setLatestRuns(data.data || []);
        } catch (e) {
            console.error('Failed to fetch runs', e);
        }
    };

    useEffect(() => {
        fetchRuns();
        const interval = setInterval(fetchRuns, 5000); // Auto refresh
        return () => clearInterval(interval);
    }, []);

    const handleTestRun = async () => {
        setIsRunning(true);
        try {
            // Use a default mock config for one-click test
            // Or use the last successful config? For MVP, we use a fixed demo query or empty to test flow.
            // User requested "Test Run" button.
            // Let's us a generic search for "macbook" or similar to ensure hits, or user provided config.
            // Actually, we'll send a default "Test Run" request.
            await fetch('http://localhost:3001/api/run/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId: `test_${Date.now()}`,
                    mode: 'onetime',
                    targetUrl: 'https://jp.mercari.com/search?keyword=macbook', // Default Test
                    config: { maxItems: 10 }
                })
            });
            setTimeout(fetchRuns, 1000);
        } catch (e) {
            console.error('Run failed', e);
            alert('Run failed to start');
        } finally {
            setIsRunning(false);
        }
    };

    const handleOpenRunsDir = async () => {
        if (window.electron && window.electron.openFolder) {
            await window.electron.openFolder();
        } else {
            alert('Runs folder Access is only available in Electron app.');
        }
    };

    const latest = latestRuns[0];

    const getDownloadUrl = (runId: string, type: string) => `http://localhost:3001/api/runs/${runId}/files/${type}`;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">ダッシュボード</h1>
                        <p className="text-slate-600 dark:text-[#9da8b9] text-base font-normal leading-normal mt-2">
                            MerFoxへようこそ。
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleOpenRunsDir}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-light dark:bg-[#1a2430] border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[20px]">folder_open</span>
                            <span>Runsを開く</span>
                        </button>
                        <button
                            onClick={handleTestRun}
                            disabled={isRunning}
                            className={`flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">{isRunning ? 'hourglass_top' : 'play_arrow'}</span>
                            <span>{isRunning ? '実行中...' : 'テスト実行 (Macbook)'}</span>
                        </button>
                    </div>
                </div>

                {/* Latest Run Card */}
                {latest && (
                    <div className="bg-surface-light dark:bg-[#1a2430] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10 relative">
                            <div>
                                <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">最新の実行結果</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{new Date(latest.date).toLocaleString()}</h3>
                                <p className="text-sm text-slate-500 font-mono mt-1">ID: {latest.id}</p>
                            </div>
                            <div className="flex gap-2">
                                <a
                                    href={getDownloadUrl(latest.id, 'amazon')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${latest.hasAmazon ? 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                    onClick={e => !latest.hasAmazon && e.preventDefault()}
                                >
                                    <span className="material-symbols-outlined text-sm">download</span> Amazon TSV
                                </a>
                                <a
                                    href={getDownloadUrl(latest.id, 'profit')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${latest.hasProfit ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                    onClick={e => !latest.hasProfit && e.preventDefault()}
                                >
                                    <span className="material-symbols-outlined text-sm">payments</span> Profit TSV
                                </a>
                                <a
                                    href={getDownloadUrl(latest.id, 'asin')}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${latest.hasAsin ? 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                    onClick={e => !latest.hasAsin && e.preventDefault()}
                                >
                                    <span className="material-symbols-outlined text-sm">link</span> ASIN TSV
                                </a>
                            </div>
                        </div>
                        <div className="absolute -right-10 -bottom-10 bg-primary/5 rounded-full size-64 blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
                    </div>
                )}
            </header>

            {/* Recents Table */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">最近の実行履歴</h2>
                </div>
                <div className="bg-surface-light dark:bg-[#1a2430] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto min-h-[200px]">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-[#111418] text-slate-500 dark:text-[#9da8b9] border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-bold">実行日時</th>
                                    <th className="px-6 py-4 font-bold">ID</th>
                                    <th className="px-6 py-4 font-bold">成果物</th>
                                    <th className="px-6 py-4 font-bold text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {latestRuns.map(run => (
                                    <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                            {new Date(run.date).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {run.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {run.hasAmazon && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">AMZ</span>}
                                                {run.hasProfit && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">PRF</span>}
                                                {run.hasAsin && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">ASN</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a href={getDownloadUrl(run.id, 'log')} className="text-slate-400 hover:text-primary transition-colors text-xs font-bold mr-2">LOG</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
