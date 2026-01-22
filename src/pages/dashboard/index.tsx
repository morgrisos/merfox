import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Dashboard() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">ダッシュボード</h1>
                        <p className="text-slate-600 dark:text-[#9da8b9] text-base font-normal leading-normal mt-2">
                            MerFoxへようこそ。直近のスクレイピング活動とシステムの状態を確認できます。
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-light dark:bg-[#1a2430] border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-[20px]">refresh</span>
                            <span>更新</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>新規抽出</span>
                        </button>
                    </div>
                </div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-surface-light dark:bg-[#1a2430] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">総抽出アイテム数</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">inventory_2</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">12,450</h3>
                            <div className="flex items-center gap-1 mt-1 text-green-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>+12.5%</span>
                                <span className="text-[#9da8b9] font-normal ml-1">先月比</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-primary/5 rounded-full size-24 blur-xl group-hover:bg-primary/10 transition-colors"></div>
                    </div>
                    <div className="bg-surface-light dark:bg-[#1a2430] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">今月の実行回数</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">play_circle</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">85</h3>
                            <div className="flex items-center gap-1 mt-1 text-green-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>+5.2%</span>
                                <span className="text-[#9da8b9] font-normal ml-1">先月比</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-purple-500/5 rounded-full size-24 blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
                    </div>
                    <div className="bg-surface-light dark:bg-[#1a2430] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">平均成功率</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">check_circle</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">98.2<span className="text-lg text-[#9da8b9] font-medium">%</span></h3>
                            <div className="flex items-center gap-1 mt-1 text-slate-500 dark:text-[#9da8b9] text-xs font-normal">
                                <span>エラー率: 1.8%</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-green-500/5 rounded-full size-24 blur-xl group-hover:bg-green-500/10 transition-colors"></div>
                    </div>
                    <div className="bg-surface-light dark:bg-[#1a2430] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">変換待ちデータ</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">hourglass_top</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">3</h3>
                            <div className="flex items-center gap-1 mt-1 text-orange-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">notification_important</span>
                                <span>要アクション</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-orange-500/5 rounded-full size-24 blur-xl group-hover:bg-orange-500/10 transition-colors"></div>
                    </div>
                </div>
            </header>

            {/* Recents Table */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">最近の活動</h2>
                    <a href="#" className="text-sm font-bold text-primary hover:text-blue-400 transition-colors">すべて見る</a>
                </div>
                <div className="bg-surface-light dark:bg-[#1a2430] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-[#111418] text-slate-500 dark:text-[#9da8b9] border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-bold">タスク名 / ターゲット</th>
                                    <th className="px-6 py-4 font-bold">プラットフォーム</th>
                                    <th className="px-6 py-4 font-bold">ステータス</th>
                                    <th className="px-6 py-4 font-bold">取得数</th>
                                    <th className="px-6 py-4 font-bold">実行日時</th>
                                    <th className="px-6 py-4 font-bold text-right">アクション</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                <tr className="hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded bg-slate-200 dark:bg-[#282f39] flex items-center justify-center text-xs font-bold text-slate-600 dark:text-[#9da8b9]">M</div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">Search: "vintage camera"</span>
                                                <span className="text-xs text-slate-500 dark:text-[#9da8b9]">https://jp.mercari.com/...</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-red-500"></span>
                                            <span>Mercari</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                                            完了
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">150</td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-[#9da8b9]">2分前</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded bg-slate-200 dark:bg-[#282f39] flex items-center justify-center text-xs font-bold text-slate-600 dark:text-[#9da8b9]">S</div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">Shop: "Kyoto Antiques"</span>
                                                <span className="text-xs text-slate-500 dark:text-[#9da8b9]">https://shopee.sg/...</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-orange-500"></span>
                                            <span>Shopee</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                            実行中
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">45 / 200</td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-[#9da8b9]">15分前</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50 dark:hover:bg-[#202b3a] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded bg-slate-200 dark:bg-[#282f39] flex items-center justify-center text-xs font-bold text-slate-600 dark:text-[#9da8b9]">M</div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">Search: "ps5 console"</span>
                                                <span className="text-xs text-slate-500 dark:text-[#9da8b9]">https://jp.mercari.com/...</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-red-500"></span>
                                            <span>Mercari</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                            エラー
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">0</td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-[#9da8b9]">1時間前</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

Dashboard.getLayout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>;
