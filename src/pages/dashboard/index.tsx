import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRunHistory } from '@/hooks/useRunHistory';

import { PlayCircle, FileText, FolderOpen, AlertTriangle, CheckCircle, ArrowRight, Activity, TrendingUp, AlertCircle, Search } from 'lucide-react';

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
        className="bg-[#111418] border border-[#282f39] rounded-xl p-5 relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
    >
        <div className="flex justify-between items-start z-10 relative">
            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">{title}</span>
            <div className={`p-2 rounded-lg bg-[#1a2027] text-[#9da8b9] group-hover:text-white transition-colors`}>
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

const PriorityRow = ({ priority, status, profit, risk, title }: any) => (
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
                {status === 'OK' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
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
            <button className="text-primary hover:text-blue-400 text-xs font-bold px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors">
                {status === 'OK' ? '詳細' : status === 'Mapping' ? 'マッピング' : '確認'}
            </button>
        </td>
    </tr>
);

export default function Dashboard() {
    const router = useRouter();
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
        cta: { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' } as any
    });

    // Additional state for resolving Main CTA source
    // const [latestRunId, setLatestRunId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/dashboard/summary');
                if (res.ok) {
                    const data = await res.json();
                    setSummaryData({
                        newCandidates: data.newCandidates,
                        uploadReady: data.uploadReady,
                        needMapping: data.mappingPending,
                        warnings: data.warnings,
                        top10: data.top10 || [],
                        dangers: data.dangers || [],
                        cta: data.cta || { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' }
                    });
                    // setLatestRunId(data.latestRunId);
                }
            } catch (e) {
                console.error('Failed to fetch dashboard stats', e);
            }
        };
        fetchStats();
    }, []);

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
                color: 'bg-green-600'
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
    const dangerList = summaryData.dangers.length > 0 ? summaryData.dangers : [];

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-[#0d1117] text-white font-sans">
            {/* 1. Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">今日の成果</h1>
                    <p className="text-[#9da8b9] text-sm mt-1">今日の実行結果をまとめました。次にやることを確認しましょう。</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => router.push('/wizard/step1')} className="flex items-center gap-2 px-3 py-2 bg-[#1a2027] hover:bg-[#282f39] border border-[#282f39] rounded-lg text-xs font-bold text-white transition-colors">
                        <PlayCircle className="w-4 h-4 text-primary" /> スタート
                    </button>
                    <button onClick={() => router.push('/runs')} className="flex items-center gap-2 px-3 py-2 bg-[#1a2027] hover:bg-[#282f39] border border-[#282f39] rounded-lg text-xs font-bold text-white transition-colors">
                        <Activity className="w-4 h-4 text-[#9da8b9]" /> Runs
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-[#1a2027] hover:bg-[#282f39] border border-[#282f39] rounded-lg text-xs font-bold text-white transition-colors">
                        <FileText className="w-4 h-4 text-green-500" /> 最終TSV
                    </button>
                </div>
            </header>

            {/* 2. Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard
                    title="新規候補"
                    count={summaryData.newCandidates}
                    sub="今日取得・重複除外済"
                    icon={<Search className="w-5 h-5" />}
                    colorClass="bg-blue-500"
                />
                <SummaryCard
                    title="出品OK"
                    count={summaryData.uploadReady}
                    sub="Amazonアップロード可能"
                    icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                    colorClass="bg-green-500"
                />
                <SummaryCard
                    title="要商品ID"
                    count={summaryData.needMapping}
                    sub="未設定 (埋めると出品増)"
                    icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
                    colorClass="bg-orange-500"
                    onClick={() => router.push('/mapping')}
                />
                <SummaryCard
                    title="危険 / 注意"
                    count={summaryData.warnings}
                    sub="欠品・公開終了の可能性"
                    icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                    colorClass="bg-red-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* 3. Main CTA */}
                    <div className="bg-[#111418] border border-[#282f39] rounded-xl p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-start gap-4 z-10">
                            <div className={`p-4 rounded-full ${mainCTA.color} bg-opacity-20 text-white shrink-0`}>
                                {mainCTA.icon}
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Next Action</h3>
                                <h2 className="text-xl font-bold text-white">{mainCTA.title}</h2>
                                <p className="text-[#9da8b9] text-sm mt-1 max-w-md">{mainCTA.desc}</p>
                            </div>
                        </div>
                        <button
                            onClick={mainCTA.action}
                            className={`z-10 px-6 py-3 rounded-lg font-bold text-white shadow-lg flex items-center gap-2 transition-transform hover:scale-105 ${mainCTA.color}`}
                        >
                            {mainCTA.btnText} <ArrowRight className="w-4 h-4" />
                        </button>
                        {/* Background Effect */}
                        <div className={`absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-${mainCTA.color.replace('bg-', '')}/10 to-transparent pointer-events-none`}></div>
                    </div>

                    {/* 4. Priorities Table */}
                    <div className="bg-[#111418] border border-[#282f39] rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#282f39] flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-yellow-500" />
                                優先して見るべき 10件
                            </h3>
                            <span className="text-xs text-[#9da8b9]">利益予測に基づく</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left bg-[#111418]">
                                <thead className="bg-[#1a2027] text-[#9da8b9] text-xs font-bold uppercase">
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
                                            <td colSpan={6} className="px-4 py-8 text-center text-[#9da8b9]">
                                                データがありません
                                            </td>
                                        </tr>
                                    ) : (
                                        priorityCandidates.map((item: any, idx: number) => (
                                            <PriorityRow
                                                key={idx}
                                                priority="High" // TODO: Real priority logic
                                                status="OK"     // TODO: Real status logic
                                                profit={item.price}
                                                risk="低"
                                                title={item.title}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-3 bg-[#1a2027] border-t border-[#282f39] text-center">
                            <button className="text-xs font-bold text-[#9da8b9] hover:text-white transition-colors">全件表示</button>
                        </div>
                    </div>
                </div>

                {/* Right Column (Side Info) */}
                <div className="flex flex-col gap-6">

                    {/* 5. Danger/Warning */}
                    <div className="bg-[#111418] border border-[#282f39] rounded-xl p-5">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            危険 / 注意一覧
                        </h3>
                        <div className="space-y-3">
                            {dangerList.length === 0 ? (
                                <div className="text-center text-[#9da8b9] text-xs py-4">問題なし</div>
                            ) : (
                                dangerList.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                        <span className="text-red-400 truncate max-w-[200px]" title={item.message}>{item.message}</span>
                                        <span className="font-bold text-white">WARN</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <button className="w-full mt-4 py-2 text-xs font-bold text-[#9da8b9] border border-[#282f39] rounded-lg hover:bg-[#282f39] hover:text-white transition-colors">
                            詳細リストを確認
                        </button>
                    </div>

                    {/* 6. Recent Runs */}
                    <div className="bg-[#111418] border border-[#282f39] rounded-xl overflow-hidden flex-1">
                        <div className="px-5 py-4 border-b border-[#282f39] flex justify-between items-center bg-[#1a2027]">
                            <h3 className="font-bold text-white text-sm">最近のRun</h3>
                            <Link href="/runs" className="text-xs text-primary hover:text-blue-400 font-bold">すべて見る</Link>
                        </div>
                        <div className="divide-y divide-[#282f39]">
                            {history.length === 0 ? (
                                <div className="p-8 text-center text-[#9da8b9] text-sm">履歴なし</div>
                            ) : (
                                history.slice(0, 5).map(run => (
                                    <div key={run.id} className="p-4 hover:bg-[#202b3a] transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-white truncate max-w-[150px]">
                                                {run.platform === 'mercari' ? 'Mercari Search' : 'Shopee Search'}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${run.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                run.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                                                }`}>
                                                {run.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-[#9da8b9]">
                                            <span>{new Date(run.date).toLocaleDateString()}</span>
                                            <span>{run.stats.success} 件取得</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 7. Automation Promo */}
                    <div className="bg-gradient-to-br from-blue-900/20 to-[#111418] border border-blue-500/20 rounded-xl p-5 text-center">
                        <div className="size-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-400">
                            <span className="material-symbols-outlined">smart_toy</span>
                        </div>
                        <h3 className="font-bold text-white mb-1">運用を自動化</h3>
                        <p className="text-xs text-[#9da8b9] mb-4">
                            毎日決まった時間に自動で抽出を実行し、通知を受け取れます。
                        </p>
                        <Link href="/automation" className="block w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
                            自動化を設定する
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}

Dashboard.getLayout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>;
