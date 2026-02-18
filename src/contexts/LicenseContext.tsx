import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LicenseService, LicenseStatus } from '../lib/license/LicenseService';

interface LicenseContextType {
    status: LicenseStatus;
    activate: (key: string) => Promise<{ success: boolean; message?: string }>;
    deactivate: () => Promise<void>;
    verifyOnline: () => Promise<boolean>; // NEW
    isLoading: boolean;
    checkStatus: () => Promise<void>;
    // [DISPLAY ONLY]
    displaySubscriptionStatus: string | null;
    displayLicenseStatus: string | null;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<LicenseStatus>('UNAUTHENTICATED');
    const [isLoading, setIsLoading] = useState(true);

    // [DISPLAY ONLY] UI fields
    const [displaySubscriptionStatus, setDisplaySubscriptionStatus] = useState<string | null>(null);
    const [displayLicenseStatus, setDisplayLicenseStatus] = useState<string | null>(null);

    const service = LicenseService.getInstance();

    const checkStatus = async () => {
        // Try renew lease if needed
        await service.renewLease();
        // Update status
        const s = service.getStatus();
        console.log(`[LicenseContext] Status: ${s}`);
        setStatus(s);

        // Sync to localStorage (UI helper)
        if (typeof window !== 'undefined') {
            localStorage.setItem('merfox_license_status', s);
            const token = service.getLeaseToken();
            if (token) {
                localStorage.setItem('merfox_lease_token', token);
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            await service.init();
            await checkStatus();
            setIsLoading(false);
        };
        init();

        // Periodic lease renewal check (every 1 hour)
        const interval = setInterval(checkStatus, 1000 * 60 * 60);
        return () => clearInterval(interval);
    }, []);

    const activate = async (key: string) => {
        setIsLoading(true);
        const result = await service.activate(key);

        if (result.success) {
            setStatus('ACTIVE');
            // Sync to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('merfox_license_key', key);
                localStorage.setItem('merfox_license_status', 'ACTIVE');
                const token = service.getLeaseToken();
                if (token) {
                    localStorage.setItem('merfox_lease_token', token);
                }
            }
        }

        setIsLoading(false);
        return result;
    };


    const verifyOnline = async (): Promise<boolean> => {
        const result = await service.verifyOnline();
        console.log('[LicenseContext] Online verification:', result);

        // [DISPLAY ONLY] Update UI state
        if (result.subscriptionStatus) setDisplaySubscriptionStatus(result.subscriptionStatus);
        if (result.licenseStatus) setDisplayLicenseStatus(result.licenseStatus);

        // Update status based on verification (BLOCKING LOGIC - UNCHANGED)
        if (!result.ok) {
            if (result.status === 'network_error') {
                // Network error - check if within offline grace
                const localStatus = service.getStatus();
                setStatus(localStatus);
                return localStatus === 'ACTIVE' || localStatus === 'OFFLINE_GRACE';
            } else {
                // License inactive/expired
                setStatus('SUSPENDED');
                return false;
            }
        }

        setStatus('ACTIVE');
        return true;
    };

    const deactivate = async () => {
        setIsLoading(true);
        await service.deactivate();
        setStatus('UNAUTHENTICATED');
        // Clear localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem('merfox_license_key');
            localStorage.removeItem('merfox_license_status');
            localStorage.removeItem('merfox_lease_token');
        }
        setIsLoading(false);
    };

    return (
        <LicenseContext.Provider value={{
            status, activate, deactivate, verifyOnline, isLoading, checkStatus,
            displaySubscriptionStatus, displayLicenseStatus
        }}>
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
