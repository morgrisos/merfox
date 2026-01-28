import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ComingSoon } from '@/components/ui/ComingSoon';
import { Card } from '@/components/ui/card';

import { LicenseSection } from '@/components/settings/LicenseSection';

export default function Settings() {
    return (
        <div className="flex flex-col h-full bg-app-base text-app-text-main p-6 gap-6">
            <div className="flex flex-col gap-2">
                <nav className="flex flex-wrap gap-2 text-sm">
                    <Link href="/" className="text-app-text-muted font-medium hover:text-white transition-colors">ダッシュボード</Link>
                    <span className="text-app-text-muted font-medium">/</span>
                    <span className="text-white font-medium">設定</span>
                </nav>
                <h1 className="text-3xl font-bold text-white">設定</h1>
                <p className="text-app-text-muted text-base max-w-2xl">
                    アプリケーションの全般設定とライセンス管理を行います。
                </p>
            </div>

            {/* License Management */}
            <LicenseSection />

            {/* APP INFO & UPDATE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-app-surface border-app-border">
                    <h3 className="text-lg font-bold text-white mb-4">バージョン情報</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Version</span>
                            <span className="text-white font-mono">v0.1.83</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Build SHA</span>
                            <span className="text-white font-mono" title={process.env.NEXT_PUBLIC_BUILD_SHA}>
                                {(process.env.NEXT_PUBLIC_BUILD_SHA || 'dev').substring(0, 7)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-app-text-muted">Built At</span>
                            <span className="text-white font-mono">
                                {process.env.NEXT_PUBLIC_BUILD_TIME ? new Date(process.env.NEXT_PUBLIC_BUILD_TIME).toLocaleString() : 'Dev'}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-app-surface border-app-border">
                    <h3 className="text-lg font-bold text-white mb-4">アップデート</h3>
                    <div className="space-y-4">
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-200 text-sm">
                            <span className="font-bold">手動更新モード:</span> TLS/SSL制限回避のため、自動更新は無効化されています。
                        </div>
                        <Link
                            href="https://github.com/morgrisos/merfox/releases"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-2 px-4 bg-app-element hover:bg-app-element/80 text-white text-center rounded border border-app-border transition-colors text-sm font-medium"
                        >
                            GitHub Releases で最新版を確認
                        </Link>
                    </div>
                </Card>
            </div>

            <hr className="border-app-border" />

            {/* Coming Soon Area */}
            <ComingSoon
                title="設定機能は開発中です"
                description="現在、設定の永続化は未実装です。監視条件のパラメータは「在庫監視」画面で都度指定してください。P2フェーズにて実装予定です。"
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
