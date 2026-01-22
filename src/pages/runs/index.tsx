import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Runs() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0d1117] text-white">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">Runs (履歴)</h1>
                        <p className="text-[#9da8b9] text-base font-normal leading-normal mt-2">
                            過去のスクレイピング実行履歴を表示します。結果の確認や再実行が可能です。
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-[#111418] rounded-xl border border-[#282f39] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap text-[#9da8b9]">
                        <thead className="bg-[#1a2027] text-[#9da8b9] border-b border-[#282f39]">
                            <tr>
                                <th className="px-6 py-4 font-bold">タスク名 / ターゲット</th>
                                <th className="px-6 py-4 font-bold">プラットフォーム</th>
                                <th className="px-6 py-4 font-bold">ステータス</th>
                                <th className="px-6 py-4 font-bold">取得数</th>
                                <th className="px-6 py-4 font-bold">実行日時</th>
                                <th className="px-6 py-4 font-bold text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#282f39] text-white">
                            <tr className="hover:bg-[#202b3a] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded bg-[#282f39] flex items-center justify-center text-xs font-bold text-[#9da8b9]">M</div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">Search: "vintage camera"</span>
                                            <span className="text-xs text-[#9da8b9]">https://jp.mercari.com/...</span>
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
                                <td className="px-6 py-4 text-[#9da8b9]">2分前</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">more_vert</span>
                                    </button>
                                </td>
                            </tr>
                            <tr className="hover:bg-[#202b3a] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded bg-[#282f39] flex items-center justify-center text-xs font-bold text-[#9da8b9]">S</div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">Shop: "Kyoto Antiques"</span>
                                            <span className="text-xs text-[#9da8b9]">https://shopee.sg/...</span>
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
                                <td className="px-6 py-4 text-[#9da8b9]">15分前</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined">more_vert</span>
                                    </button>
                                </td>
                            </tr>
                            <tr className="hover:bg-[#202b3a] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded bg-[#282f39] flex items-center justify-center text-xs font-bold text-[#9da8b9]">M</div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">Search: "ps5 console"</span>
                                            <span className="text-xs text-[#9da8b9]">https://jp.mercari.com/...</span>
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
                                <td className="px-6 py-4 text-[#9da8b9]">1時間前</td>
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
    );
}

Runs.getLayout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>;
