import { AppShell } from '@/components/layout/AppShell';
import { Eye, Plus, AlertTriangle } from 'lucide-react';

export default function InventoryMonitoring() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white">
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black leading-tight tracking-[-0.033em] text-white">在庫監視</h1>
                        <p className="text-app-text-muted text-base font-normal leading-normal mt-2">
                            Amazonに出品中の商品を監視し、メルカリでの在庫状況を自動チェック
                        </p>
                    </div>
                    <button
                        disabled
                        className="px-6 py-3 bg-app-element text-app-text-muted rounded-xl font-bold flex items-center gap-2 cursor-not-allowed opacity-60"
                    >
                        <Plus className="w-5 h-5" />
                        監視商品を追加
                    </button>
                </div>
            </div>

            {/* Preparation Status Banner */}
            <div className="max-w-5xl mx-auto w-full mb-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-3">⚠️ この機能は現在準備中です</h3>
                    <p className="text-sm text-blue-100/90 mb-3">
                        近日公開予定の機能です。実装後は以下が可能になります：
                    </p>
                    <ul className="text-sm text-blue-100/80 space-y-1.5 pl-5" style={{ listStyle: 'disc' }}>
                        <li><strong className="text-blue-200">在庫切れ検知</strong> - メルカリ元商品のSOLD OUT自動検知</li>
                        <li><strong className="text-blue-200">価格変動監視</strong> - 元商品の値下げ・値上げをリアルタイム追跡</li>
                        <li><strong className="text-blue-200">削除検知</strong> - 商品ページ削除時に即座にアラート</li>
                    </ul>

                    <div className="mt-5 pt-5 border-t border-blue-500/20">
                        <h4 className="text-base font-bold text-white mb-3">📖 使い方（準備完了後）</h4>
                        <div className="space-y-2.5">
                            <div className="flex gap-3">
                                <span className="text-primary font-bold text-sm">1.</span>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-sm">
                                        Amazon出品中商品を登録</p>
                                    <p className="text-xs text-blue-200/70">監視したいASIN/SKUを登録します</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-primary font-bold text-sm">2.</span>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-sm">元メルカリURLを紐付け</p>
                                    <p className="text-xs text-blue-200/70">仕入れ元のメルカリ商品URLを関連付けます</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-primary font-bold text-sm">3.</span>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-sm">自動監視開始</p>
                                    <p className="text-xs text-blue-200/70">定期チェックで価格・在庫変動をダッシュボードに通知</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto w-full flex flex-col gap-8">

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">監視中</p>
                        <p className="text-3xl font-black text-white">0</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">正常</p>
                        <p className="text-3xl font-black text-white">0</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">注意</p>
                        <p className="text-3xl font-black text-white">0</p>
                    </div>
                    <div className="bg-app-surface border border-app-border rounded-xl p-5">
                        <p className="text-xs text-app-text-muted font-bold uppercase mb-2">危険</p>
                        <p className="text-3xl font-black text-red-500">0</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-app-surface border border-app-border rounded-xl p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <input
                            type="text"
                            placeholder="商品名 / ASIN / メルカリURL"
                            disabled
                            className="flex-1 bg-app-element border border-app-border rounded-lg px-4 py-2 text-white placeholder:text-app-text-muted outline-none cursor-not-allowed"
                        />
                        <select
                            disabled
                            className="bg-app-element border border-app-border rounded-lg px-4 py-2 text-white cursor-not-allowed"
                        >
                            <option>すべて</option>
                            <option>危険</option>
                            <option>注意</option>
                            <option>正常</option>
                        </select>
                        <select
                            disabled
                            className="bg-app-element border border-app-border rounded-lg px-4 py-2 text-white cursor-not-allowed"
                        >
                            <option>危険優先</option>
                            <option>更新が新しい</option>
                            <option>価格差</option>
                        </select>
                        <span className="text-xs text-app-text-muted whitespace-nowrap">最終更新: --</span>
                    </div>
                </div>

                {/* Empty State */}
                <div className="bg-app-surface border-2 border-dashed border-app-border rounded-xl p-12 text-center">
                    <div className="w-20 h-20 bg-app-element rounded-full flex items-center justify-center mx-auto mb-4">
                        <Eye className="w-10 h-10 text-app-text-muted" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">まだ監視中の商品がありません</h3>
                    <p className="text-app-text-muted mb-6 max-w-lg mx-auto">
                        Amazonに出品中の商品を登録すると、元のメルカリ商品を自動チェックします
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            disabled
                            className="px-6 py-2 bg-app-element text-app-text-muted rounded-lg font-bold cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4 inline mr-2" />
                            監視商品を追加
                        </button>
                        <button
                            disabled
                            className="px-6 py-2 border border-app-border text-app-text-muted rounded-lg font-bold cursor-not-allowed"
                        >
                            使い方を見る
                        </button>
                    </div>
                </div>

                {/* Coming Soon Notice */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-base font-bold text-blue-400 mb-1">この機能は現在準備中です</h4>
                        <p className="text-sm text-blue-200/80">
                            リリース時に自動で有効化されます。
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

InventoryMonitoring.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
