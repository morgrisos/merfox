import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { label: 'ダッシュボード', path: '/', icon: 'dashboard', iconFill: true, weight: 'font-bold' },
    { label: 'スクレイパー', path: '/scraper', icon: 'bolt' },
    { label: '抽出設定', path: '/settings', icon: 'settings' },
    { label: 'データ変換', path: '/converter', icon: 'cloud_upload' },
    { label: 'CSV管理', path: '/csv', icon: 'table_view' },
];

export const Sidebar = () => {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <aside className="w-72 bg-[#111418] border-r border-[#282f39] flex flex-col justify-between flex-shrink-0 h-full overflow-hidden">
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex gap-3 items-center mb-8 px-2">
                    <div className="bg-center bg-no-repeat bg-cover rounded-lg size-10 bg-primary/10 flex items-center justify-center">
                        <img src="/merfox-mark.png" alt="MerFox Logo" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-base font-bold leading-normal">MerFox</h1>
                        <p className="text-[#9da8b9] text-xs font-normal leading-normal">管理コンソール</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive(item.path) ? 'bg-primary/20 text-primary border border-primary/10' : 'text-[#9da8b9] hover:bg-[#282f39] hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined ${item.iconFill ? 'fill-1' : ''}`}>{item.icon}</span>
                            <p className={`text-sm leading-normal ${item.weight || 'font-medium'}`}>{item.label}</p>
                        </Link>
                    ))}
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
