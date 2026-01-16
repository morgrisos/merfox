'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Error Info Structure
export interface AppErrorDetail {
    message: string;
    name?: string;
    stack?: string;
    screen?: string; // Where it happened
    action?: string; // What was being done
    raw?: any;       // Original error object
}

interface AppErrorContextType {
    error: AppErrorDetail | null;
    showError: (detail: AppErrorDetail) => void;
    clearError: () => void;
}

const AppErrorContext = createContext<AppErrorContextType | undefined>(undefined);

export const AppErrorProvider = ({ children }: { children: ReactNode }) => {
    const [error, setError] = useState<AppErrorDetail | null>(null);

    const showError = useCallback((detail: AppErrorDetail) => {
        console.error('[AppError]', detail);
        setError(detail);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return (
        <AppErrorContext.Provider value={{ error, showError, clearError }}>
            {children}
        </AppErrorContext.Provider>
    );
};

export const useAppError = () => {
    const context = useContext(AppErrorContext);
    if (!context) {
        throw new Error('useAppError must be used within an AppErrorProvider');
    }
    return context;
};
