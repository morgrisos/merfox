import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Zap, Settings, Server, ArrowLeft } from 'lucide-react';

export const WizardSidebar = () => {
    const router = useRouter();
    const isActive = (path: string) => router.pathname.startsWith(path);

    // Helper to determine active step for visual feedback in sidebar
    const getCurrentStep = () => {
        const match = router.pathname.match(/step(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };
    const currentStep = getCurrentStep();

    return (
        <aside className="w-72 bg-[#111418] border-r border-[#282f39] flex flex-col justify-between flex-shrink-0 h-full overflow-hidden font-sans">
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* Brand / Header */}
                <div className="flex gap-3 items-center mb-8 px-2">
                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 bg-primary/20 flex items-center justify-center text-primary">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-base font-bold leading-normal">MerFox</h1>
                        <p className="text-[#9da8b9] text-xs font-normal leading-normal">Wizard Console</p>
                    </div>
                </div>

                {/* Main Navigation - Wizard Focused */}
                <div className="flex flex-col gap-2">
                    <div className="px-3 pb-2 text-xs font-bold text-[#9da8b9] uppercase tracking-wider">
                        実行中のタスク
                    </div>

                    <Link href="/wizard/step1" className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive('/wizard') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span className="text-sm font-bold">新規抽出を実行</span>
                            </div>
                            <div className="text-xs opacity-70 mt-1 pl-6">
                                {currentStep > 0 ? `ステップ ${currentStep} / 6` : 'ここから開始'}
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Legacy / Advanced Links */}
                <div className="flex flex-col gap-2 mt-8">
                    <div className="px-3 pb-2 text-xs font-bold text-[#9da8b9] uppercase tracking-wider">
                        機能一覧
                    </div>

                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9da8b9] hover:bg-[#282f39] hover:text-white transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-sm font-medium">ダッシュボード</span>
                    </Link>
                    <Link href="/scraper" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9da8b9] hover:bg-[#282f39] hover:text-white transition-colors">
                        <Server className="w-5 h-5" />
                        <span className="text-sm font-medium">スクレイパー状況</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9da8b9] hover:bg-[#282f39] hover:text-white transition-colors">
                        <Settings className="w-5 h-5" />
                        <span className="text-sm font-medium">設定チェック</span>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#111418] border-t border-[#282f39]">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#9da8b9] cursor-not-allowed opacity-50">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">ログアウト</span>
                </div>
            </div>
        </aside>
    );
};
