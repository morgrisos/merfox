import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { useRunHistory } from '@/hooks/useRunHistory';
import { useLicense } from '@/contexts/LicenseContext';
import { apiFetch } from '@/lib/apiFetch';

import { PlayCircle, FileText, FolderOpen, AlertTriangle, CheckCircle, CheckCircle2, ArrowRight, Activity, TrendingUp, Search } from 'lucide-react';

// --- Types ---
type CardProps = {
    title: string;
    count: number | string;
    sub?: string;
    icon: React.ReactNode;
    colorClass: string;
    onClick?: () => void;
};

// --- Components ---
const SummaryCard = ({ title, count, sub, icon, colorClass, onClick }: CardProps) => (
    <div
        onClick={onClick}
        className="bg-app-surface border border-app-border rounded-xl p-5 relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
    >
        <div className="flex justify-between items-start z-10 relative">
            <span className="text-app-text-muted text-xs font-bold uppercase tracking-wider">{title}</span>
            <div className={`p-2 rounded-lg bg-app-element text-app-text-muted group-hover:text-white transition-colors`}>
                {icon}
            </div>
        </div>
        <div className="mt-4 z-10 relative">
            <h3 className="text-3xl font-black text-white">{count}</h3>
            {sub && <p className="text-xs text-[#9da8b9] mt-1">{sub}</p>}
        </div>
        <div className={`absolute -right-4 -bottom-4 size-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}></div>
    </div>
);

const PriorityRow = ({ priority, status, profit, risk, title, onAction }: any) => (
    <tr className="hover:bg-[#202b3a] transition-colors text-sm border-b border-[#282f39] last:border-0">
        <td className="px-4 py-3">
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${priority === 'High' ? 'bg-red-500/20 text-red-400' :
                priority === 'Med' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                {priority}
            </span>
        </td>
        <td className="px-4 py-3">
            <div className="flex items-center gap-2">
                {status === 'OK' ? <CheckCircle className="w-4 h-4 text-primary" /> :
                    status === 'Mapping' ? <Activity className="w-4 h-4 text-orange-500" /> :
                        <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className="text-white font-medium">
                    {status === 'OK' ? '出品OK' : status === 'Mapping' ? '要マッピング' : '注意'}
                </span>
            </div>
        </td>
        <td className="px-4 py-3 text-[#9da8b9] font-mono">{profit}</td>
        <td className="px-4 py-3 text-[#9da8b9]">{risk}</td>
        <td className="px-4 py-3 text-white max-w-[200px] truncate">{title}</td>
        <td className="px-4 py-3 text-right">
            <button
                onClick={onAction}
                className="text-primary hover:text-blue-400 text-xs font-bold px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
            >
                {status === 'OK' ? '詳細' : status === 'Mapping' ? 'マッピング' : '確認'}
            </button>
        </td>
    </tr>
);

export default function Dashboard() {
    const router = useRouter();
    const { status } = useLicense();
    const isActive = status === 'ACTIVE' || status === 'OFFLINE_GRACE';
    const { history } = useRunHistory();
    const latestRun = history.length > 0 ? history[0] : null;

    // --- Real Data Fetching ---
    const [summaryData, setSummaryData] = React.useState({
        newCandidates: 0,
        uploadReady: 0,
        needMapping: 0,
        warnings: 0,
        top10: [] as any[],
        dangers: [] as any[],
        cta: { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' } as any,
        watchAlertsCount: 0,
        watchAlerts: [] as any[]
    });

    React.useEffect(() => {
        // Do not fetch when license is not active — avoids 403 and unnecessary requests
        if (!isActive) return;

        const fetchStats = async () => {
            try {
                const res = await apiFetch('/api/dashboard/summary');
                if (res.status === 403) {
                    // License cookie not yet synced — silently skip; UI shows empty state
                    console.warn('[Dashboard] 403 from summary API — license cookie may not be set yet');
                    return;
                }
                if (!res.ok) {
                    console.error('[Dashboard] Summary API error:', res.status);
                    return;
                }
                const data = await res.json();
                // Guard: only update state when numeric values or arrays actually changed
                setSummaryData(prev => {
                    const next = {
                        newCandidates: data.newCandidates ?? 0,
                        uploadReady: data.uploadReady ?? 0,
                        needMapping: data.mappingPending ?? 0,
                        warnings: data.warnings ?? 0,
                        top10: Array.isArray(data.top10) ? data.top10 : [],
                        dangers: Array.isArray(data.dangers) ? data.dangers : [],
                        cta: data.cta || { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' },
                        watchAlertsCount: data.watchAlertsCount ?? 0,
                        watchAlerts: Array.isArray(data.watchAlerts) ? data.watchAlerts : []
                    };
                    if (prev.newCandidates === next.newCandidates &&
                        prev.uploadReady === next.uploadReady &&
                        prev.needMapping === next.needMapping &&
                        prev.warnings === next.warnings &&
                        prev.top10.length === next.top10.length &&
                        prev.dangers.length === next.dangers.length &&
                        prev.watchAlertsCount === next.watchAlertsCount) {
                        return prev;
                    }
                    return next;
                });
            } catch (e) {
                console.error('Failed to fetch dashboard stats', e);
            }
        };
        fetchStats();
    }, [isActive]);

    // --- Logic: Main CTA ---
    const getMainCTA = () => {
        // 1. Running Status (from History hook which tracks client-side state correctly for running)
        // Note: API might not know 'running' status instantly if files aren't updated, 
        // but existing hook is better for 'Running' status. 
        if (latestRun?.status === 'running') {
            return {
                title: '実行状況を見る',
                desc: '現在スクレイピングが実行中です。進捗を確認してください。',
                action: () => router.push('/scraper'),
                icon: <Activity className="w-6 h-6" />,
                btnText: 'ステータス確認',
                color: 'bg-orange-500'
            };
        }

        // 2. Upload Ready (High Priority)
        if (summaryData.uploadReady > 0) {
            return {
                title: '最終TSVを開く',
                desc: '出品可能なデータが準備できています。ファイルを確認してアップロードしてください。',
                action: () => console.log('Open TSV'), // TODO: IPC Open File
                icon: <FileText className="w-6 h-6" />,
                btnText: 'フォルダを開く',
                color: 'bg-primary'
            };
        }

        // 3. Mapping Needed
        if (summaryData.needMapping > 0) {
            return {
                title: 'マッピングを行う',
                desc: '未設定のカテゴリーがあります。設定を完了させましょう。',
                action: () => router.push('/wizard/step4'),
                icon: <FolderOpen className="w-6 h-6" />,
                btnText: 'マッピング画面へ',
                color: 'bg-blue-600'
            };
        }

        // 4. Default: Start New
        return {
            title: '新規抽出を開始',
            desc: '新しい商品をリサーチしましょう。ウィザードから開始できます。',
            action: () => router.push('/wizard/step1'),
            icon: <PlayCircle className="w-6 h-6" />,
            btnText: 'スタート',
            color: 'bg-primary'
        };
    };

    const mainCTA = getMainCTA();

    const priorityCandidates = summaryData.top10.length > 0 ? summaryData.top10 : [];
    const watchAlertList = summaryData.watchAlerts;
    const watchAlertsCount = summaryData.watchAlertsCount;

    const handleDismissAlert = async (watch_id: string) => {
        try {
            const res = await apiFetch(`/api/inventory/${watch_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alert_level: 'normal', alert_reason: 'resolved', is_resolved: true })
            });
            if (res.ok) {
                setSummaryData(prev => ({
                    ...prev,
                    watchAlerts: prev.watchAlerts.filter(i => i.watch_id !== watch_id),
                    watchAlertsCount: Math.max(0, prev.watchAlertsCount - 1)
                }));
            }
        } catch (e) {
            console.error('[DASH_DISMISS_ERROR]', e);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-app-base text-app-text-main font-sans">
            {/* 1. Header */}
            <PageHeader icon={<TrendingUp className="w-6 h-6" />} title="今日の成果" description="今日の実行結果をまとめました。次にやることを確認しましょう。" />

            {/* 2. Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                    title="新規候補"
                    count={summaryData.newCandidates}
                    sub="今日取得・重複除外済"
                    icon={<Search className="w-5 h-5" />}
                    colorClass="bg-blue-500"
                    onClick={() => router.push('/history?filter=new')}
                />
                <SummaryCard
                    title="出品OK"
                    count={summaryData.uploadReady}
                    sub="Amazonアップロード可能"
                    icon={<CheckCircle className="w-5 h-5 text-primary" />}
                    colorClass="bg-primary"
                    onClick={() => router.push('/history?filter=ready')}
                />
                <SummaryCard
                    title="危険 / 注意"
                    count={watchAlertsCount}
                    sub="在庫監視の未対応アラート"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                    colorClass="bg-red-500"
                    onClick={() => router.push('/inventory?filter=alerts')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* 3. Main CTA */}
                    <div className="bg-app-surface border border-app-border rounded-xl p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-start gap-4 z-10">
                            <div className={`p-4 rounded-full ${mainCTA.color} bg-opacity-20 text-white shrink-0`}>
                                {mainCTA.icon}
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Next Action</h3>
                                <h2 className="text-xl font-bold text-white">{mainCTA.title}</h2>
                                <p className="text-app-text-muted text-sm mt-1 max-w-md">{mainCTA.desc}</p>
                            </div>
                        </div>
                        <button
                            onClick={mainCTA.action}
                            className={`z-10 px-6 py-3 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 transition-transform hover:scale-105 whitespace-nowrap ${mainCTA.color}`}
                        >
                            {mainCTA.btnText} <ArrowRight className="w-4 h-4" />
                        </button>
                        {/* Background Effect */}
                        <div className={`absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-${mainCTA.color.replace('bg-', '')}/10 to-transparent pointer-events-none`}></div>
                    </div>

                    {/* 4. Priorities Table */}
                    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-yellow-500" />
                                優先して見るべき 5件
                            </h3>
                            <span className="text-xs text-app-text-muted">利益予測に基づく</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left bg-app-surface">
                                <thead className="bg-[#1a2027] text-app-text-muted text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-4 py-3">優先度</th>
                                        <th className="px-4 py-3">状態</th>
                                        <th className="px-4 py-3">予測利益</th>
                                        <th className="px-4 py-3">リスク</th>
                                        <th className="px-4 py-3">タイトル</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priorityCandidates.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center">
                                                <p className="text-app-text-muted mb-4">まだリサーチがありません</p>
                                                <button
                                                    onClick={() => router.push('/wizard/step1')}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 font-bold transition-colors"
                                                >
                                                    新規リサーチを開始
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        priorityCandidates.slice(0, 5).map((item: any, idx: number) => (
                                            <PriorityRow
                                                key={idx}
                                                priority="High"
                                                status={item.asin ? 'OK' : 'Mapping'}
                                                profit={item.price}
                                                risk="低"
                                                title={item.title}
                                                onAction={() => item.runId
                                                    ? router.push(`/wizard/step4?runId=${item.runId}`)
                                                    : router.push('/history')
                                                }
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-3 bg-[#1a2027] border-t border-app-border text-center">
                            <button className="text-xs font-bold text-app-text-muted hover:text-white transition-colors">全件表示</button>
                        </div>
                    </div>
                </div>

                {/* Right Column (Side Info) */}
                <div className="flex flex-col gap-6">

                    {/* 5. Inventory Watch Alerts */}
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            在庫監視 — 未対応アラート
                        </h3>
                        <div className="space-y-2">
                            {watchAlertList.length === 0 ? (
                                <div className="text-center text-app-text-muted text-xs py-4">
                                    {watchAlertsCount === 0 ? '問題なし — すべて正常' : '読み込み中...'}
                                </div>
                            ) : (
                                watchAlertList.slice(0, 3).map((item: any) => (
                                    <div key={item.watch_id} className={`p-3 rounded-lg border text-sm ${item.level === 'danger' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${item.level === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {item.level === 'danger' ? '危険' : '注意'}
                                            </span>
                                            <button
                                                onClick={() => handleDismissAlert(item.watch_id)}
                                                title="対応済みにする"
                                                className="text-[10px] text-green-400 hover:text-green-300 shrink-0 flex items-center gap-0.5"
                                            >
                                                <CheckCircle2 className="w-3 h-3" />対応済み
                                            </button>
                                        </div>
                                        <p className="text-white font-medium truncate text-xs" title={item.title}>{item.title}</p>
                                        <p className="text-app-text-muted text-[11px] mt-0.5">
                                            {item.reason === 'sold_detected' ? '売り切れ' :
                                             item.reason === 'deleted_404' ? '削除済み' :
                                             item.reason === 'price_changed' ? '価格変動' :
                                             item.last_known_status === 'sold' ? '売り切れ' :
                                             item.last_known_status === 'deleted' ? '削除済み' :
                                             item.reason || item.last_known_status || '確認推奨'}
                                        </p>
                                    </div>
                                ))
                            )}
                            {watchAlertList.length > 3 && (
                                <p className="text-xs text-app-text-muted text-center pt-1">他 {watchAlertsCount - 3} 件</p>
                            )}
                        </div>
                        <button
                            onClick={() => router.push('/inventory?filter=alerts')}
                            className="w-full mt-4 py-2 text-xs font-bold text-app-text-muted border border-app-border rounded-lg hover:bg-app-border hover:text-white transition-colors"
                        >
                            在庫監視で詳しく確認 →
                        </button>
                    </div>

                    {/* 6. Recent Runs */}
                    <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden flex-1">
                        <div className="px-5 py-4 border-b border-app-border flex justify-between items-center bg-[#1a2027]">
                            <h3 className="font-bold text-white text-sm">直近のリサーチ</h3>
                            <Link href="/history" className="text-xs text-primary hover:text-blue-400 font-bold">すべて見る</Link>
                        </div>
                        <div className="divide-y divide-app-border">
                            {history.length === 0 ? (
                                <div className="p-8 text-center text-app-text-muted text-sm">履歴なし</div>
                            ) : (
                                history.slice(0, 3).map(run => (
                                    <div key={run.id} className="p-4 hover:bg-[#202b3a] transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-white truncate max-w-[130px]">
                                                {run.platform === 'mercari' ? 'Mercari Search' : 'Shopee Search'}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${run.status === 'completed' ? 'bg-primary/10 text-primary' :
                                                    run.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                                                    }`}>
                                                    {run.status}
                                                </span>
                                                {/* Open run folder via IPC */}
                                                <button
                                                    title="成果物フォルダを開く"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            const res = await apiFetch(`/api/runs/${run.id}/path`);
                                                            if (res.ok) {
                                                                const { path: runPath } = await res.json();
                                                                (window as any).merfox?.openExternal?.(`file://${runPath}`);
                                                            }
                                                        } catch { /* ignore */ }
                                                    }}
                                                    className="text-app-text-muted hover:text-white transition-colors"
                                                >
                                                    <FolderOpen className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-app-text-muted">
                                            <span>{new Date(run.date).toLocaleDateString()}</span>
                                            <span>{run.stats.success} 件取得</span>
                                        </div>
                                        {/* [P3] 0件Run explanation */}
                                        {run.stats.success === 0 && (
                                            <p className="mt-1 text-[10px] text-app-text-muted/70 leading-relaxed">
                                                ※ 0件は正常終了の場合があります。検索URLの on_sale フィルタや条件を確認してください。
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>


                </div>
            </div>
        </div >
    );
}

Dashboard.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
