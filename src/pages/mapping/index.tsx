import React from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Mapping() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0d1117] text-white">
            <header className="flex flex-col gap-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">マッピング</h1>
                        <p className="text-[#9da8b9] text-base font-normal leading-normal mt-2">
                            カテゴリー選定やアイテム定義を行います。（移行中）
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-[#111418] rounded-xl border border-[#282f39] p-8 flex flex-col items-center justify-center gap-4 text-center">
                <div className="p-4 bg-[#1a2027] rounded-full">
                    <span className="material-symbols-outlined text-4xl text-[#9da8b9]">table_view</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">準備中</h2>
                    <p className="text-[#9da8b9]">
                        この機能は現在移行作業中です。<br />
                        カテゴリーマッピングの設定はウィザードから行えます。
                    </p>
                </div>
                <Link href="/wizard/step4" className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-colors">
                    ウィザードのマッピングへ移動
                </Link>
            </div>
        </div>
    );
}

Mapping.getLayout = (page: React.ReactElement) => <AppLayout>{page}</AppLayout>;
