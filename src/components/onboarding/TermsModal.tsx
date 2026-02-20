import React from 'react';
import { X } from 'lucide-react';

interface TermsModalProps {
    isOpen: boolean;
    onAgree: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onAgree }) => {
    const [agreed, setAgreed] = React.useState(false);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111418] border border-[#282f39] rounded-xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">ご利用にあたって</h2>
                        <p className="text-sm text-[#9da8b9]">MerFox v1.0 - 重要事項の確認</p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-6 bg-[#0d1014] border border-[#282f39] rounded-lg p-6">
                    <div className="text-white space-y-4">
                        <p className="text-base leading-relaxed">
                            <span className="font-bold text-primary">MerFox</span>は、メルカリの商品情報を抽出し、Amazon出品の補助を行うツールです。
                        </p>

                        <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-4">
                            <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                                ⚠️ 重要な注意事項
                            </h3>
                            <ul className="text-sm text-[#9da8b9] space-y-2 list-disc list-inside">
                                <li>出品の可否判断は利用者の責任で行ってください</li>
                                <li>真贋確認・規制確認は必ず利用者が実施してください</li>
                                <li>ブランド品・偽造品・規制品の取り扱いは厳禁です</li>
                                <li>Amazonアカウント停止のリスクを理解してください</li>
                                <li>本ツールは抽出支援のみを提供します</li>
                            </ul>
                        </div>

                        <div className="bg-blue-900/10 border border-primary/30 rounded-lg p-4">
                            <h3 className="text-primary font-bold mb-2">📋 本ツールの機能</h3>
                            <ul className="text-sm text-[#9da8b9] space-y-1 list-disc list-inside">
                                <li>メルカリ検索結果からのデータ抽出</li>
                                <li>Amazon TSV形式への変換</li>
                                <li>カテゴリマッピング補助</li>
                                <li>安全カテゴリのみの抽出（本・CD・DVD・ゲーム・おもちゃ）</li>
                            </ul>
                        </div>

                        <p className="text-sm text-[#9da8b9] leading-relaxed">
                            本ツールを使用することで発生したいかなる損害についても、開発者は一切の責任を負いません。
                            利用者自身の判断と責任のもとでご使用ください。
                        </p>
                    </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="mb-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="mt-1 w-5 h-5 rounded border-[#282f39] bg-[#0d1014] text-primary focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-sm text-white group-hover:text-primary transition-colors">
                            上記の内容を理解し、自己責任のもと利用することに同意します
                        </span>
                    </label>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => {
                        if (agreed) onAgree();
                    }}
                    disabled={!agreed}
                    className={`w-full py-3 rounded-lg font-bold text-base transition-all ${agreed
                            ? 'bg-primary text-white hover:bg-blue-600 cursor-pointer'
                            : 'bg-[#282f39] text-[#9da8b9] cursor-not-allowed'
                        }`}
                >
                    {agreed ? '同意して利用開始' : '上記に同意してください'}
                </button>

                <p className="text-xs text-[#9da8b9] text-center mt-4">
                    この同意は初回のみ表示されます。利用規約は設定画面からいつでも確認できます。
                </p>
            </div>
        </div>
    );
};
