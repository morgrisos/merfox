import React from 'react';
import { Sidebar } from '../Sidebar.next';
import { useRouter } from 'next/router';

export const WizardLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();

    // Helper to determine active step
    const getCurrentStep = () => {
        const match = router.pathname.match(/step(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };
    const currentStep = getCurrentStep();

    return (
        <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden font-sans">
            <Sidebar />
            <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Header App Shell - Matches settings/index.tsx */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-[#282f39] bg-[#111418] px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-[#9da8b9]">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h2 className="text-white text-lg font-bold leading-normal">抽出ウィザード</h2>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        {currentStep > 0 && (
                            <div className="bg-[#282f39] px-3 py-1.5 rounded-full border border-[#282f39]">
                                <span className="text-xs font-bold text-[#9da8b9] tracking-wider uppercase">
                                    Step <span className="text-primary">{currentStep}</span> / 6
                                </span>
                            </div>
                        )}
                        <button className="flex items-center justify-center size-10 rounded-full text-[#9da8b9] hover:bg-[#282f39] transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 border border-[#282f39]" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAAnPeGM9XGN-yL64x75QxROZTF0Ntb8VBqxFYGDNOtt5DNBsukBcC3rLrGh2K64ws1DzbdTMZUEXxTMGke_cX7uiI_cmZ84tqFTud8vTi6iMMEpdPCJAjW_m1BkgW09HDS8O4UpxfR5BbVIgbK-PZhrQ_Zyo5qdadHnM2eNsEnXrWcMQwXOKyVz66l88d2YFiMjDn9n8LaWAtWOoAgVs0T0eJBs0Bjs1uU0sMHgaWUwsXOyluXlIpLADVvxH_LJX1kUyKAd4Ejt4CN")' }}>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0d1117]">
                    <div className="max-w-5xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
