import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Dashboard() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0d1117] text-white">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">ダッシュボード</h1>
                        <p className="text-[#9da8b9] text-base font-normal leading-normal mt-2">
                            MerFoxへようこそ。直近のスクレイピング活動とシステムの状態を確認できます。
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1a2430] border border-[#282f39] rounded-lg text-sm font-bold text-white hover:bg-[#202b3a] transition-all cursor-pointer">
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
                    <div className="bg-[#111418] p-5 rounded-xl border border-[#282f39] shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">総抽出アイテム数</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">inventory_2</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-white">12,450</h3>
                            <div className="flex items-center gap-1 mt-1 text-green-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>+12.5%</span>
                                <span className="text-[#9da8b9] font-normal ml-1">先月比</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-primary/5 rounded-full size-24 blur-xl group-hover:bg-primary/10 transition-colors"></div>
                    </div>
                    <div className="bg-[#111418] p-5 rounded-xl border border-[#282f39] shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">今月の実行回数</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">play_circle</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-white">85</h3>
                            <div className="flex items-center gap-1 mt-1 text-green-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>+5.2%</span>
                                <span className="text-[#9da8b9] font-normal ml-1">先月比</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-purple-500/5 rounded-full size-24 blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
                    </div>
                    <div className="bg-[#111418] p-5 rounded-xl border border-[#282f39] shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">平均成功率</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">check_circle</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-white">98.2<span className="text-lg text-[#9da8b9] font-medium">%</span></h3>
                            <div className="flex items-center gap-1 mt-1 text-[#9da8b9] text-xs font-normal">
                                <span>エラー率: 1.8%</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-green-500/5 rounded-full size-24 blur-xl group-hover:bg-green-500/10 transition-colors"></div>
                    </div>
                    <div className="bg-[#111418] p-5 rounded-xl border border-[#282f39] shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
                        <div className="flex justify-between items-start z-10">
                            <span className="text-[#9da8b9] text-xs font-bold uppercase tracking-wider">変換待ちデータ</span>
                            <span className="material-symbols-outlined text-[#9da8b9] opacity-50">hourglass_top</span>
                        </div>
                        <div className="z-10">
                            <h3 className="text-3xl font-black text-white">3</h3>
                            <div className="flex items-center gap-1 mt-1 text-orange-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">notification_important</span>
                                <span>要アクション</span>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 bg-orange-500/5 rounded-full size-24 blur-xl group-hover:bg-orange-500/10 transition-colors"></div>
                    </div>
                </div>
            </header>

            {/* Recents Section (Minimized) */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">最近の活動</h2>
                    <a href="/runs" className="text-sm font-bold text-primary hover:text-blue-400 transition-colors">すべて見る</a>
                </div>

                {/* Simple Entry Point to Runs */}
                <div className="bg-[#111418] rounded-xl border border-[#282f39] p-6 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="p-3 bg-[#1a2027] rounded-full">
                        <span className="material-symbols-outlined text-slate-400">history</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">実行履歴を確認</h3>
                        <p className="text-xs text-[#9da8b9] mt-1 max-w-sm">
                            過去のすべてのスクレイピング結果やステータスを確認するには、履歴ページへ移動してください。
                        </p>
                    </div>
                    <a href="/runs" className="mt-2 px-4 py-2 bg-[#282f39] hover:bg-[#343b47] text-white rounded-lg text-sm font-bold transition-colors">
                        履歴ページを開く
                    </a>
                </div>
            </div>
        </div>
    );
}

Dashboard.getLayout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>;
