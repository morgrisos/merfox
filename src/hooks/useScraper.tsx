'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './useSettings';
import { ExecutionStats, ScraperConfig } from '../lib/types';

export type ScraperStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';

// Keep ScraperStats for compatibility with UI components if they rely on this specific shape
// Or map ExecutionStats to ScraperStats.
// V4 UI uses: newItems, excluded.{shops...}, failed.
// ExecutionStats has: collected, excluded.{shops...}, errors.
// Mapping: newItems -> collected, failed -> errors.

export type ScraperStats = {
    totalItems: number; // totalScanned
    newItems: number; // collected
    excluded: {
        shops: number;
        unknown: number;
        shipping: number;
        ngWord: number;
        highPrice: number; // mapped from price
    };
    failed: number; // errors
};

type LogEntry = {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
};

type ScraperContextType = {
    status: ScraperStatus;
    stats: ScraperStats;
    logs: LogEntry[];
    currentUrl: string;
    isTestMode: boolean; // Ignored for Real IPC usually, or handled by scraping logic
    isTestComplete: boolean;
    startScraping: (testMode?: boolean) => void;
    stopScraping: () => void;
    pauseScraping: () => void;
    resumeScraping: () => void;
    resetScraper: () => void;
};

const ScraperContext = createContext<ScraperContextType | undefined>(undefined);

export const ScraperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useSettings();

    // Status mapped from IPC or internal
    const [status, setStatus] = useState<ScraperStatus>('IDLE');

    const [stats, setStats] = useState<ScraperStats>({
        totalItems: 0,
        newItems: 0,
        excluded: { shops: 0, unknown: 0, shipping: 0, ngWord: 0, highPrice: 0 },
        failed: 0
    });

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentUrl, setCurrentUrl] = useState('');
    const [isTestMode, setIsTestMode] = useState(false); // Kept for UI state
    const [isTestComplete, setIsTestComplete] = useState(false);

    // Listen to IPC Status Events
    useEffect(() => {
        if (typeof window !== 'undefined' && window.electron && window.electron.onStatus) {
            const unsubscribe = window.electron.onStatus((executionStats: ExecutionStats) => {
                // Map Backend Stats to Frontend Stats
                setStats({
                    totalItems: executionStats.totalScanned,
                    newItems: executionStats.collected,
                    excluded: {
                        shops: executionStats.excluded.shops,
                        unknown: executionStats.excluded.unknown,
                        shipping: executionStats.excluded.shipping,
                        ngWord: executionStats.excluded.ng,
                        highPrice: executionStats.excluded.price
                    },
                    failed: executionStats.errors
                });

                // Map Status
                // executionStats.status ('running' etc) -> ScraperStatus (UPPERCASE)
                const s = executionStats.status.toUpperCase() as ScraperStatus;
                if (s !== status) setStatus(s);
            });
            return () => unsubscribe();
        }
    }, [status]);

    const addLog = (level: LogEntry['level'], message: string) => {
        const timestamp = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        setLogs(prev => [...prev.slice(-99), { timestamp, level, message }]);
    };

    const startScraping = async (test = false) => {
        setIsTestMode(test);
        setIsTestComplete(false);
        setLogs([]); // Clear logs on start
        addLog('INFO', test ? 'テスト実行を開始します...' : '本番実行を開始します...');

        // Convert AppSettings to ScraperConfig
        const config: ScraperConfig = {
            mode: settings.target.mode as 'url' | 'keyword',
            url: settings.target.url,
            keyword: settings.target.keyword,
            excludeKeyword: settings.target.excludeKeyword,
            category: settings.target.category,

            excludeShops: settings.filters.excludeShops,
            excludeUnknown: settings.filters.excludeUnknown,
            excludeShippingPaid: settings.filters.onlyFreeShipping,
            ngWords: settings.filters.ngWords,
            ngRegex: settings.filters.ngRegex,

            outputDir: settings.outputDir,

            // Limits
            countLimit: settings.stopConditions.useCount ? settings.stopConditions.countLimit : undefined,
            timeLimit: settings.stopConditions.useTime ? settings.stopConditions.timeLimit : undefined,

            watchInterval: settings.collectionMode === 'watch' ? settings.watchInterval : undefined
        };

        if (window.electron) {
            try {
                await window.electron.start(config);
            } catch (e: any) {
                addLog('ERROR', `起動エラー: ${e.message}`);
            }
        } else {
            console.warn('Mock Start - Electron not found');
            setStatus('RUNNING'); // Mock fallback
        }
    };

    const stopScraping = async () => {
        addLog('WARN', '停止要求を送信中...');
        if (window.electron) {
            await window.electron.stop();
        }
        setStatus('IDLE');
    };

    const pauseScraping = () => {
        // Not implemented in backend yet?
        setStatus('PAUSED');
        addLog('WARN', '一時停止 (未実装)');
    };

    const resumeScraping = () => {
        setStatus('RUNNING');
    };

    const resetScraper = () => {
        setStatus('IDLE');
        setStats({ totalItems: 0, newItems: 0, excluded: { shops: 0, unknown: 0, shipping: 0, ngWord: 0, highPrice: 0 }, failed: 0 });
        setLogs([]);
        setIsTestComplete(false);
    };

    return (
        <ScraperContext.Provider value={{
            status, stats, logs, currentUrl, isTestMode, isTestComplete,
            startScraping, stopScraping, pauseScraping, resumeScraping, resetScraper
        }}>
            {children}
        </ScraperContext.Provider>
    );
};

export const useScraper = () => {
    const context = useContext(ScraperContext);
    if (!context) throw new Error('useScraper must be used within ScraperProvider');
    return context;
};
