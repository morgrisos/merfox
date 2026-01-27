import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { Card } from '@/components/ui/card';

export default function Settings() {
    return (
        <div className="flex flex-col h-full bg-app-base text-app-text-main p-6 gap-6">
            <div className="flex flex-col gap-2">
                <nav className="flex flex-wrap gap-2 text-sm">
                    <Link href="/" className="text-app-text-muted font-medium hover:text-white transition-colors">ダッシュボード</Link>
                    <span className="text-app-text-muted font-medium">/</span>
                    <span className="text-app-text-muted font-medium">スクレイパー</span>
                    <span className="text-app-text-muted font-medium">/</span>
                    <span className="text-white font-medium">設定</span>
                </nav>
                <h1 className="text-3xl font-bold text-white">抽出設定</h1>
                <p className="text-app-text-muted text-base max-w-2xl">
                    スクレイピングエンジンのターゲットURLと実行パラメータを構成します。
                </p>
            </div>

            <hr className="border-app-border" />

            {/* Coming Soon Area */}
            <ComingSoon
                title="設定機能は開発中です"
                description="現在、設定の永続化は未実装です。スクレイピングのパラメータは「スクレイパー」画面で都度指定してください。P2フェーズにて実装予定です。"
            />

            {/* Disabled UI Visualization (Faded out) */}
            <div className="opacity-30 pointer-events-none grayscale select-none">
                <Card className="p-6 bg-app-surface border-app-border space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">抽出対象 (プレビュー)</h3>
                        <div className="p-4 bg-app-element rounded border border-app-border">
                            <div className="text-sm font-semibold text-app-text-muted mb-2">プラットフォーム選択</div>
                            <div className="p-3 border-2 border-primary bg-primary/10 rounded-lg flex items-center justify-between">
                                <span className="font-bold text-white">Mercari</span>
                                <div className="bg-red-500 w-2 h-2 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

Settings.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
