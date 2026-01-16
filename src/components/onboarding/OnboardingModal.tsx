'use client';
import { useState, useEffect } from 'react';

export const OnboardingModal = () => {
    const [show, setShow] = useState(false);
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;
    const STORAGE_KEY = 'merfox.onboarding.v1.seen';

    useEffect(() => {
        // Check initial state
        try {
            const hasSeen = localStorage.getItem(STORAGE_KEY);
            if (hasSeen !== '1') {
                setShow(true);
            }
        } catch (e) {
            console.error('Failed to access localStorage:', e);
            // Fallback: show modal if we can't check
            setShow(true);
        }

        // Event listener for re-showing
        const handleShowEvent = () => {
            setStep(1);
            setShow(true);
        };
        window.addEventListener('merfox:show-onboarding', handleShowEvent);

        return () => {
            window.removeEventListener('merfox:show-onboarding', handleShowEvent);
        };
    }, []);

    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [show]);

    const handleClose = () => {
        try {
            localStorage.setItem(STORAGE_KEY, '1');
        } catch (e) {
            console.error('Failed to save onboarding state:', e);
        }
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-8 shadow-2xl flex flex-col items-center text-center relative animate-in fade-in zoom-in-95 duration-200">

                {/* Close Button (X) */}
                <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Content */}
                <div className="flex-1 w-full mb-8 min-h-[200px] flex flex-col items-center justify-center">
                    {step === 1 && (
                        <>
                            <span className="material-symbols-outlined text-6xl text-blue-500 mb-6">search</span>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">ようこそ MerFox へ</h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                「Scraper（抽出）」タブから<br />メルカリのURLを入力して実行します。<br />
                                抽出されたデータは自動的に保存されます。
                            </p>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <span className="material-symbols-outlined text-6xl text-green-500 mb-6">shield</span>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">安全な自動化</h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                初期設定は安全寄り（待機時間・上限）になっています。<br />
                                変更する場合は「設定」から調整できます。<br />
                                <span className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 block">※プラットフォームの制限にご注意ください。</span>
                            </p>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <span className="material-symbols-outlined text-6xl text-orange-500 mb-6">help</span>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">サポートと更新</h2>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                困った時は「設定」→「トラブルシューティング」<br />からログを確認できます。<br />
                                更新は「設定」から手動で最新版を開いて行えます。
                            </p>
                        </>
                    )}
                </div>

                {/* Footer / Navigation */}
                <div className="w-full flex items-center justify-between">
                    {/* Dots */}
                    <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${step === i ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                戻る
                            </button>
                        )}

                        {step < TOTAL_STEPS ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                            >
                                次へ
                            </button>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-500/20"
                            >
                                始める
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
