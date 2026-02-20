import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';


import { Activity, Plus, Play, Square, Trash2, Edit, AlertCircle, Clock, CheckCircle } from 'lucide-react';

// [Phase 6] Latest Log Summary for Monitor


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

export default function InventoryMonitor() {

    const [jobs, setJobs] = useState<WatchJob[]>([]);

    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [intervalInput, setIntervalInput] = useState(30);


    // Mock Fetch Jobs (In real app, fetch from API)
    useEffect(() => {
        // Mock data for UI demo
        setJobs([
            {
                id: 'job_1',
                targetUrl: 'https://jp.mercari.com/search?keyword=EOS%20Kiss',
                isEnabled: true,
                intervalMinutes: 30,
                lastRunAt: new Date().toISOString(),
                nextRunAt: new Date(Date.now() + 30 * 60000).toISOString(),
                stats: { totalRuns: 12, totalItemsFound: 45 }
            }
        ]);
    }, []);

    const handleCreateJob = async () => {
        // Mock creation
        const newJob: WatchJob = {
            id: crypto.randomUUID(),
            targetUrl: urlInput,
            isEnabled: true,
            intervalMinutes: intervalInput,
            lastRunAt: null,
            nextRunAt: new Date().toISOString(),
            stats: { totalRuns: 0, totalItemsFound: 0 }
        };
        setJobs(prev => [...prev, newJob]);
        setShowCreateModal(false);
        setUrlInput('');
    };

    const toggleJob = (id: string) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, isEnabled: !j.isEnabled } : j));
    };

    const deleteJob = (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id));
    };

    return (
        <div className="flex flex-col h-full bg-app-base text-white font-sans p-6 overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-3">
                            <Activity className="w-8 h-8 text-primary" />
                            定期実行
                        </h1>
                        <p className="text-app-text-muted mt-2">
                            メルカリの検索条件を登録し、定期的に自動で商品を抽出します。
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        監視ジョブを作成
                    </button>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-app-surface border border-app-border rounded-xl p-5 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-app-text-muted font-bold uppercase">稼働中のジョブ</p>
                            <p className="text-2xl font-black text-white">{jobs.filter(j => j.isEnabled).length} <span className="text-sm font-normal text-app-text-muted">/ {jobs.length}</span></p>
                        </div>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-app-text-muted font-bold uppercase">本日の検知数</p>
                            <p className="text-2xl font-black text-white">0 <span className="text-sm font-normal text-app-text-muted">件</span></p>
                        </div>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-orange-500/10 text-orange-500">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-app-text-muted font-bold uppercase">アラート (注意)</p>
                            <p className="text-2xl font-black text-white">0 <span className="text-sm font-normal text-app-text-muted">件</span></p>
                        </div>
                    </div>
                </div>

                {/* Job List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary rounded-full"></span>
                        監視ジョブ一覧
                    </h2>

                    {jobs.length === 0 ? (
                        <div className="bg-app-surface border-2 border-dashed border-app-border rounded-xl p-12 text-center">
                            <div className="w-16 h-16 bg-app-element rounded-full flex items-center justify-center mx-auto mb-4 text-app-text-muted">
                                <Activity className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">ジョブがありません</h3>
                            <p className="text-app-text-muted mb-6 max-w-md mx-auto">
                                監視したい商品の検索URLを登録してください。定期的に巡回して新着を通知します。
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-2 bg-app-element hover:bg-app-border text-white rounded-lg font-bold transition-colors"
                            >
                                最初のジョブを作成
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {jobs.map(job => (
                                <div key={job.id} className={`bg-app-surface border ${job.isEnabled ? 'border-app-border' : 'border-app-border opacity-60'} rounded-xl p-6 transition-all hover:border-primary/30 relative group`}>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${job.isEnabled ? 'bg-primary/20 text-primary' : 'bg-app-element text-app-text-muted'}`}>
                                                    {job.isEnabled ? 'ACTIVE' : 'STOPPED'}
                                                </span>
                                                <div className="flex items-center gap-1 text-xs text-app-text-muted">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{job.intervalMinutes}分ごとにチェック</span>
                                                </div>
                                            </div>
                                            <h3 className="text-base font-bold text-white truncate font-mono mb-1 text-ellipsis overflow-hidden">
                                                {job.targetUrl}
                                            </h3>
                                            <div className="flex items-center gap-4 text-xs text-app-text-muted">
                                                <span>実行回数: {job.stats.totalRuns}</span>
                                                <span>検知アイテム: {job.stats.totalItemsFound}</span>
                                                <span>次回: {new Date(job.nextRunAt || '').toLocaleTimeString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleJob(job.id)}
                                                className={`p-2 rounded-lg border transition-colors ${job.isEnabled ? 'border-primary/30 text-primary hover:bg-primary/10' : 'border-app-border text-app-text-muted hover:text-white hover:bg-app-element'}`}
                                                title={job.isEnabled ? "停止する" : "再開する"}
                                            >
                                                {job.isEnabled ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                                            </button>
                                            <button
                                                className="p-2 rounded-lg border border-app-border text-app-text-muted hover:text-white hover:bg-app-element transition-colors"
                                                title="編集"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => deleteJob(job.id)}
                                                className="p-2 rounded-lg border border-app-border text-app-text-muted hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
                                                title="削除"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Log Timeline Placeholder */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-6 bg-app-border rounded-full"></span>
                        検知ログ (タイムライン)
                    </h2>
                    <div className="bg-app-surface border border-app-border rounded-xl p-6 min-h-[150px] flex items-center justify-center text-app-text-muted text-sm">
                        まだ検知されたイベントはありません
                    </div>
                </div>

            </div>

            {/* Create Job Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-app-surface border border-app-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-app-border">
                            <h3 className="text-lg font-bold text-white">新規監視ジョブを作成</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-app-text-muted">ターゲットURL (メルカリ検索結果)</label>
                                <input
                                    type="text"
                                    className="w-full bg-app-element border border-app-border rounded-lg p-3 text-white focus:border-primary outline-none transition-colors"
                                    placeholder="https://jp.mercari.com/search?..."
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-app-text-muted">巡回間隔</label>
                                <select
                                    className="w-full bg-app-element border border-app-border rounded-lg p-3 text-white focus:border-primary outline-none transition-colors"
                                    value={intervalInput}
                                    onChange={(e) => setIntervalInput(Number(e.target.value))}
                                >
                                    <option value={10}>10分 (高負荷)</option>
                                    <option value={30}>30分 (推奨)</option>
                                    <option value={60}>1時間</option>
                                    <option value={180}>3時間</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-app-base border-t border-app-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-app-text-muted hover:text-white font-bold transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleCreateJob}
                                disabled={!urlInput}
                                className="px-6 py-2 bg-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                            >
                                保存して開始
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { LicenseGate } from '@/components/license/LicenseGate';

InventoryMonitor.getLayout = (page: React.ReactElement) => (
    <AppShell>
        <LicenseGate>{page}</LicenseGate>
    </AppShell>
);
