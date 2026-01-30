import React from 'react';
import { useRouter } from 'next/router';
import { useLicense } from '@/contexts/LicenseContext';
import { BlockingScreen } from './BlockingScreen';

interface Props {
    children: React.ReactNode;
}

export function LicenseGate({ children }: Props) {
    const { status, isLoading } = useLicense();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#111418] text-white">
                <div className="animate-pulse">Checking License...</div>
            </div>
        );
    }

    // [DEV BYPASS] Stopgap for Wizard Relock
    const router = useRouter();
    if (typeof window !== 'undefined') {
        const key = localStorage.getItem('merfox_license_key');
        if (key === 'MER-DEV-0000' && router.pathname.startsWith('/wizard')) {
            console.log('[LICENSE][GUARD] DEV Bypass Active in Wizard');
            return <>{children}</>;
        }
    }

    // Allowed Statues
    if (status === 'ACTIVE' || status === 'OFFLINE_GRACE') {
        return <>{children}</>;
    }

    // Blocked
    return <BlockingScreen />;
}
