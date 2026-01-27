import React from 'react';
import { AppShell } from '@/components/layout/AppShell';


export default function Runs() {
    const [runs, setRuns] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchRuns = async () => {
            try {
                const res = await fetch('/api/runs');
                if (res.ok) {
                    const json = await res.json();
                    setRuns(json.data || []);
                }
            } catch (e) {
                console.error('Failed to fetch runs', e);
            } finally {
                setLoading(false);
            }
        };
        fetchRuns();
    }, []);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">Runs (履歴)</h1>
                        <p className="text-app-text-muted text-base font-normal leading-normal mt-2">
                            過去のスクレイピング実行履歴を表示します。結果の確認や再実行が可能です。
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-app-surface rounded-xl border border-app-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap text-app-text-muted">
                        <thead className="bg-app-element text-app-text-muted border-b border-app-border">
                            <tr>
                                <th className="px-6 py-4 font-bold">タスク名 / ターゲット</th>
                                <th className="px-6 py-4 font-bold">プラットフォーム</th>
                                <th className="px-6 py-4 font-bold">ステータス</th>
                                <th className="px-6 py-4 font-bold">取得数</th>
                                <th className="px-6 py-4 font-bold">実行日時</th>
                                <th className="px-6 py-4 font-bold text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border text-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-app-text-muted">
                                        読み込み中...
                                    </td>
                                </tr>
                            ) : runs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-app-text-muted">
                                        履歴がありません
                                    </td>
                                </tr>
                            ) : (
                                runs.map((run) => (
                                    <tr key={run.id} className="hover:bg-app-element transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded bg-app-element flex items-center justify-center text-xs font-bold text-app-text-muted">
                                                    {run.platform === 'Mercari' ? 'M' : 'S'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white max-w-[200px] truncate" title={run.target}>{run.target}</span>
                                                    <span className="text-xs text-app-text-muted max-w-[200px] truncate">{run.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`size-2 rounded-full ${run.platform === 'Mercari' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                                                <span>{run.platform}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${run.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                run.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                }`}>
                                                {run.status === 'completed' ? '完了' : run.status === 'failed' ? 'エラー' : '実行中'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono">
                                            {run.stats.success} <span className="text-app-text-muted">/ {run.stats.totalScanned}</span>
                                        </td>
                                        <td className="px-6 py-4 text-app-text-muted">{run.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-app-text-muted hover:text-white transition-colors">
                                                <span className="material-symbols-outlined">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

Runs.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
