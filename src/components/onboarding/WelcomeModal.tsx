import React from 'react';
import { useRouter } from 'next/router';
import { X, Search, Link2, FileText } from 'lucide-react';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-app-surface border border-app-border rounded-2xl max-w-3xl w-full p-8 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-app-text-muted hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-white mb-2">MerFoxへようこそ</h2>
                    <p className="text-app-text-muted">
                        Mercariから商品を抽出し、Amazon出品用TSVを自動生成するツールです
                    </p>
                </div>

                {/* 3 Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Step 1 */}
                    <div className="bg-app-element border border-app-border rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">1. 抽出</h3>
                        <p className="text-sm text-app-text-muted">
                            Mercariから商品情報を検索・取得
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-app-element border border-app-border rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Link2 className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">2. カテゴリ変換</h3>
                        <p className="text-sm text-app-text-muted">
                            MercariカテゴリをAmazon商品に紐付け
                        </p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-app-element border border-app-border rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">3. TSV生成</h3>
                        <p className="text-sm text-app-text-muted">
                            Amazon出品用ファイルを作成
                        </p>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => {
                            onClose();
                            router.push('/wizard/step1?mode=test');
                        }}
                        className="px-6 py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
                    >
                        まずはテスト抽出で試す
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-app-element hover:bg-app-border text-white font-bold rounded-lg transition-colors"
                    >
                        スキップ
                    </button>
                </div>
            </div>
        </div>
    );
};
