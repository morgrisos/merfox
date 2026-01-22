import Link from 'next/link';
import { useRouter } from 'next/router';
import { LayoutDashboard, Zap, Settings, Server, ArrowLeft } from 'lucide-react';

export const AppSidebar = () => {
    const router = useRouter();
    const isActive = (path: string) => router.pathname.startsWith(path);

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
                        <p className="text-[#9da8b9] text-xs font-normal leading-normal">App Console</p>
                    </div>
                </div>

                {/* Main Navigation - Based on ④C (Limited to existing pages for now) */}
                <div className="flex flex-col gap-2">
                    <div className="px-3 pb-2 text-xs font-bold text-[#9da8b9] uppercase tracking-wider">
                        Outcome
                    </div>

                    {/* Outcome -> Dashboard */}
                    <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-sm font-medium">今日の成果</span>
                    </Link>

                    {/* Start -> Wizard Step 1 */}
                    <Link href="/wizard/step1" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/wizard') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <Zap className="w-5 h-5" />
                        <span className="text-sm font-medium">スタート</span>
                    </Link>

                    {/* Runs (履歴) */}
                    <Link href="/runs" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/runs') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[20px]">history</span>
                        <span className="text-sm font-medium">Runs (履歴)</span>
                    </Link>

                    {/* Mapping (マッピング) */}
                    <Link href="/mapping" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/mapping') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[20px]">table_view</span>
                        <span className="text-sm font-medium">マッピング</span>
                    </Link>

                    {/* Automation (自動化) */}
                    <Link href="/automation" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/automation') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                        <span className="text-sm font-medium">自動化</span>
                    </Link>

                    <div className="px-3 pb-2 text-xs font-bold text-[#9da8b9] uppercase tracking-wider mt-6">
                        Tools
                    </div>
                    <Link href="/scraper" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/scraper') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <Server className="w-5 h-5" />
                        <span className="text-sm font-medium">スクレイパー</span>
                    </Link>

                    <Link href="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/settings') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <Settings className="w-5 h-5" />
                        <span className="text-sm font-medium">設定</span>
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
