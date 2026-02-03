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
    const [elapsed, setElapsed] = React.useState(0);

    React.useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                setCheckTimeout(true);
            }, 8000); // 8 second timeout

            // Elapsed time counter
            const interval = setInterval(() => {
                setElapsed(e => e + 1);
            }, 1000);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        } else {
            setCheckTimeout(false);
            setElapsed(0);
        }
    }, [isLoading]);

    if (isLoading) {
        if (checkTimeout) {
            return (
                <div className="flex h-screen items-center justify-center bg-[#111418] text-white">
                    <div className="text-center space-y-4 max-w-md px-4">
                        <p className="text-yellow-400 text-lg">ライセンス確認に時間がかかっています</p>
                        <p className="text-sm text-gray-400">ネットワーク接続を確認してください</p>
                        <div className="flex gap-3 justify-center mt-6">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
                            >
                                再試行
                            </button>
                            <a
                                href="/diagnostics"
                                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
                            >
                                診断ページへ
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex h-screen items-center justify-center bg-[#111418] text-white">
                <div className="text-center space-y-4">
                    <div className="animate-pulse text-lg">ライセンス確認中...</div>

                    {elapsed >= 3 && (
                        <div className="w-64 mx-auto">
                            <div className="bg-gray-700 rounded-full h-2 mb-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((elapsed / 8) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400">{elapsed}秒経過...</p>
                        </div>
                    )}
                </div>
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
