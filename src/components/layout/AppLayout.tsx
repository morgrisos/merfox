import React from 'react';
import { AppSidebar } from './AppSidebar';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden font-sans">
            <AppSidebar />
            {/* Main Content Container - No Header here to avoid duplication with page headers */}
            <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#0d1117]">
                {children}
            </main>
        </div>
    );
};
