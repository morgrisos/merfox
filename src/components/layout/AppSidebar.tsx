import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NAV_SECTIONS, PRIMARY_ACTION } from '@/config/nav';
import { Zap, ArrowLeft } from 'lucide-react';

export const AppSidebar = () => {
    const router = useRouter();
    const isActive = (path: string) => {
        if (path === '/dashboard') return router.pathname === '/dashboard';
        return router.pathname.startsWith(path);
    };

    return (
        <aside className="w-72 bg-app-surface border-r border-app-border flex flex-col justify-between flex-shrink-0 h-full overflow-hidden font-sans">
            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                {/* Brand / Header */}
                <div className="flex gap-3 items-center h-16 px-6 border-b border-app-border flex-shrink-0">
                    <div className="bg-center bg-no-repeat bg-cover rounded-full size-8 bg-primary/20 flex items-center justify-center text-primary">
                        <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-white text-base font-bold leading-none">MerFox</h1>
                        <p className="text-app-text-muted text-[10px] uppercase font-bold tracking-wider mt-1">App Console</p>
                    </div>
                </div>

                {/* Primary Action */}
                <div className="p-4">
                    <button
                        onClick={() => router.push(PRIMARY_ACTION.path)}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02]"
                    >
                        {React.createElement(PRIMARY_ACTION.icon, { className: "w-5 h-5" })}
                        <span>{PRIMARY_ACTION.label}</span>
                    </button>
                </div>

                {/* Navigation Sections */}
                <div className="px-3 pb-4 space-y-6">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.title}>
                            <div className="px-3 pb-2 text-xs font-bold text-app-text-muted uppercase tracking-wider">
                                {section.title}
                            </div>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const active = isActive(item.path);
                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.path}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${active
                                                ? 'bg-primary/10 text-primary border border-primary/20 bg-opacity-50'
                                                : 'text-app-text-muted hover:bg-app-element hover:text-white border border-transparent'
                                                }`}
                                        >
                                            {React.createElement(item.icon, {
                                                className: `w-5 h-5 ${active ? 'text-primary' : 'text-slate-500 group-hover:text-white'}`
                                            })}
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-app-surface border-t border-app-border">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-app-text-muted cursor-not-allowed opacity-50 hover:bg-app-element transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">ログアウト</span>
                </div>
            </div>
        </aside>
    );
};
