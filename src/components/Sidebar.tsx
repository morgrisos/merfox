import { Link, useLocation } from 'react-router-dom';

export const Sidebar = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <aside className="w-72 bg-[#111418] border-r border-[#282f39] flex flex-col justify-between flex-shrink-0 h-full overflow-hidden">
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex gap-3 items-center mb-8 px-2">
                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-10 bg-primary/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">pets</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-base font-bold leading-normal">MerFox</h1>
                        <p className="text-[#9da8b9] text-xs font-normal leading-normal">管理コンソール</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Link to="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined fill-1">dashboard</span>
                        <p className="text-sm font-bold leading-normal">ダッシュボード</p>
                    </Link>
                    <Link to="/scraper" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/scraper') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined">bolt</span>
                        <p className="text-sm font-medium leading-normal">スクレイパー</p>
                    </Link>
                    <Link to="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/settings') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined">settings</span>
                        <p className="text-sm font-medium leading-normal">抽出設定</p>
                    </Link>
                    <Link to="/converter" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/converter') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <p className="text-sm font-medium leading-normal">データ変換</p>
                    </Link>
                    <Link to="/csv" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/csv') ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}>
                        <span className="material-symbols-outlined">table_view</span>
                        <p className="text-sm font-medium leading-normal">CSV管理</p>
                    </Link>
                </div>
            </div>
            <div className="p-4 bg-[#111418] border-t border-[#282f39]">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-700 cursor-not-allowed opacity-50" title="準備中">
                    <span className="material-symbols-outlined">logout</span>
                    <p className="text-sm font-medium leading-normal">ログアウト</p>
                </div>
            </div>
        </aside>
    );
};
