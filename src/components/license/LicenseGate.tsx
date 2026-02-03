import React from 'react';
import { useRouter } from 'next/router';
import { useLicense } from '@/contexts/LicenseContext';
import { BlockingScreen } from './BlockingScreen';

interface Props {
    children: React.ReactNode;
}

export function LicenseGate({ children }: Props) {
    const { status, isLoading } = useLicense();
    const [checkTimeout, setCheckTimeout] = React.useState(false);

    React.useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                setCheckTimeout(true);
            }, 8000); // 8 second timeout
            return () => clearTimeout(timer);
        } else {
            setCheckTimeout(false);
        }
    }, [isLoading]);

    if (isLoading) {
        if (checkTimeout) {
            return (
                <div className="flex h-screen items-center justify-center bg-[#111418] text-white">
                    <div className="text-center space-y-4">
                        <p className="text-yellow-400">ライセンス確認に時間がかかっています</p>
                        <p className="text-sm text-gray-400">ネットワーク接続を確認してください</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
                        >
                            再試行
                        </button>
                    </div>
                </div>
            );
        }
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
