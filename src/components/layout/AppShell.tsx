import React from 'react';
import { AppSidebar } from './AppSidebar';
import { twMerge } from 'tailwind-merge';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'default' | 'wizard';
    className?: string;
}

export const AppShell = ({ children, variant = 'default', className }: AppShellProps) => {
    return (
        <div className="flex h-screen bg-app-base text-app-text-main overflow-hidden font-sans" data-variant={variant}>
            {/* Persistent Sidebar */}
            <AppSidebar />

            {/* Main Content Area */}
            <main className={twMerge("flex-1 min-w-0 flex flex-col overflow-hidden bg-app-base relative", className)}>
                {/* 
                   Note: We do NOT rely on per-page headers here (like WizardLayout/AppLayout did).
                   Pages should define their own specific headers if needed, OR we can add a common header slot later.
                   For now, we just render children to keep it flexible but unified in shell.
                */}
                {children}
            </main>
        </div>
    );
};
