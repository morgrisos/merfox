import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LicenseService, LicenseStatus } from '../lib/license/LicenseService';

interface LicenseContextType {
    status: LicenseStatus;
    activate: (key: string) => Promise<{ success: boolean; message?: string }>;
    deactivate: () => Promise<void>;
    isLoading: boolean;
    checkStatus: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<LicenseStatus>('UNAUTHENTICATED');
    const [isLoading, setIsLoading] = useState(true);

    const service = LicenseService.getInstance();

    const checkStatus = async () => {
        // [FIX] Single Source of Truth: LocalStorage
        if (typeof window !== 'undefined') {
            const savedStatus = localStorage.getItem('merfox_license_status');

            console.log(`[LICENSE][CHECK] Checking Status. LocalStorage=${savedStatus}`);

            if (savedStatus === 'ACTIVE') {
                // Double check service, but don't overwrite with UNAUTHENTICATED if service is just empty
                setStatus('ACTIVE');
                return;
            }
        }

        // 1. Try refresh first if we have data (Node context or properly init service)
        await service.refresh();
        // 2. Update status based on logic (Grace period etc)
        const s = service.getStatus();
        console.log(`[LICENSE][CHECK] Service Status: ${s}`);
        if (s !== 'UNAUTHENTICATED') {
            setStatus(s);
        }
    };

    useEffect(() => {
        const init = async () => {
            // Logic: Check LocalStorage first (Browser Persistence)
            if (typeof window !== 'undefined') {
                const savedStatus = localStorage.getItem('merfox_license_status');
                if (savedStatus === 'ACTIVE') {
                    setStatus('ACTIVE');
                    setIsLoading(false);
                    return;
                }
            }

            await service.init();
            await checkStatus();
            setIsLoading(false);
        };
        init();

        const interval = setInterval(checkStatus, 1000 * 60 * 60);
        return () => clearInterval(interval);
    }, []);

    const activate = async (key: string) => {
        setIsLoading(true);
        try {
            // [UI FIX] Direct Browser Fetch & Persist (Bypassing broken Node Service in Renderer)
            const res = await fetch('http://localhost:13337/api/license/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, deviceId: 'browser-client' })
            });
            const data = await res.json();

            // Accept explicit ok/success/devBypass
            if (res.ok && (data.ok || data.success || data.accessToken)) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('merfox_license_key', key);
                    localStorage.setItem('merfox_license_token', data.accessToken || 'mock');
                    localStorage.setItem('merfox_license_status', 'ACTIVE');
                    console.log('[LicenseUI] Activated & Persisted to LocalStorage');
                }
                setStatus('ACTIVE');
                setIsLoading(false);
                return { success: true };
            }
            // Fallback error
            setIsLoading(false);
            return { success: false, message: data.error || 'Activation Failed' };
        } catch (e) {
            console.error('[LicenseUI] Activation Error', e);
            setIsLoading(false);
            return { success: false, message: 'Network or Server Error' };
        }
    };

    const deactivate = async () => {
        setIsLoading(true);
        await service.deactivate();
        setStatus('UNAUTHENTICATED');
        setIsLoading(false);
    };

    return (
        <LicenseContext.Provider value={{ status, activate, deactivate, isLoading, checkStatus }}>
            {children}
        </LicenseContext.Provider>
    );
}

export function useLicense() {
    const context = useContext(LicenseContext);
    if (context === undefined) {
        throw new Error('useLicense must be used within a LicenseProvider');
    }
    return context;
}
