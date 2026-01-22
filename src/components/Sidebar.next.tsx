import Link from 'next/link';
import { useRouter } from 'next/router';

export const Sidebar = () => {
    const router = useRouter();
    const isActive = (path: string) => {
        if (path === '/') return router.pathname === '/';
        return router.pathname.startsWith(path);
    };

    // Helper to determine active step
    const getCurrentStep = () => {
        const match = router.pathname.match(/step(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };
    const currentStep = getCurrentStep();

    return (
        <aside className="w-72 bg-[#111418] border-r border-[#282f39] flex flex-col justify-between flex-shrink-0 h-full overflow-hidden">
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* Header / Logo */}
                <div className="flex gap-3 items-center mb-8 px-2">
                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 bg-blue-600/20 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-2xl">bolt</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-base font-bold leading-normal">MerFox</h1>
                        <p className="text-[#9da8b9] text-xs font-normal leading-normal">Wizard Console</p>
                    </div>
                </div>

                {/* Main Section: Running Tasks (Wizard Context) */}
                <div className="flex flex-col gap-2 mb-8">
                    <div className="px-3 pb-2 text-xs font-bold text-[#9da8b9] uppercase tracking-wider">
                        実行中のタスク
                    </div>

                    <Link href="/wizard/step1" className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors border ${currentStep > 0 ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white border-transparent'}`}>
                        <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                                <span className="text-sm font-bold">新規抽出を実行</span>
                            </div>
                            <div className="flex justify-between items-center mt-1 pl-6">
                                <span className="text-xs opacity-80">
                                    {currentStep > 0 ? `ステップ ${currentStep} / 6` : '待機中'}
                                </span>
                                {currentStep > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Sub Section: Features */}
                <div className="flex flex-col gap-2">
                    <div className="px-3 pb-2 text-xs font-bold text-[#9da8b9] uppercase tracking-wider">
                        機能一覧
                    </div>
                    <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined fill-1">dashboard</span>
                        <p className="text-sm font-medium leading-normal">ダッシュボード</p>
                    </Link>
                    <Link href="/scraper" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/scraper') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined">bolt</span>
                        <p className="text-sm font-medium leading-normal">スクレイパー状況</p>
                    </Link>
                    <Link href="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/settings') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined">settings</span>
                        <p className="text-sm font-medium leading-normal">設定チェック</p>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#111418] border-t border-[#282f39]">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-700 cursor-not-allowed opacity-50">
                    <span className="material-symbols-outlined">logout</span>
                    <p className="text-sm font-medium leading-normal">ログアウト</p>
                </div>
            </div>
        </aside>
    );
};
