import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type ScraperStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export type ScraperStats = {
    totalItems: number; // Raw items collected
    newItems: number; // Included items
    excluded: {
        shops: number;
        unknown: number;
        shipping: number;
        ngWord: number;
        highPrice: number;
    };
    failed: number;
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
    currentUrl: string; // Mock current url being processed (or real if available)
    isTestMode: boolean; // Running 20 items test
    isTestComplete: boolean; // Test finished successfully
    startScraping: (testMode?: boolean) => void;
    stopScraping: () => void;
    pauseScraping: () => void;
    resumeScraping: () => void;
    resetScraper: () => void;
    latestRunId: string; // [FIX] Exposed for Step 2
};

const ScraperContext = createContext<ScraperContextType | undefined>(undefined);

export const ScraperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<ScraperStatus>('IDLE');
    const [stats, setStats] = useState<ScraperStats>({
        totalItems: 0,
        newItems: 0,
        excluded: { shops: 0, unknown: 0, shipping: 0, ngWord: 0, highPrice: 0 },
        failed: 0
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    // [FIX] Removed unused setCurrentUrl
    const currentUrl = '';
    const [isTestMode, setIsTestMode] = useState(false);
    const [isTestComplete, setIsTestComplete] = useState(false);
    const [latestRunId, setLatestRunId] = useState<string>('');

    const intervalRef = useRef<number | null>(null);

    const addLog = (level: LogEntry['level'], message: string) => {
        const timestamp = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        setLogs(prev => [...prev.slice(-99), { timestamp, level, message }]); // Keep last 100
    };

    const pollStatus = async () => {
        try {
            const res = await fetch('/api/scraper/status');
            const data = await res.json();

            if (data.latestRunId) setLatestRunId(data.latestRunId);

            // [FIX] Update Status/Stats from progress.json
            const counts = data.counts || { scanned: 0, success: 0, failed: 0 };

            setStats(prev => ({
                ...prev,
                totalItems: counts.scanned,
                newItems: counts.success,
                failed: counts.failed
            }));

            // [FIX] Status Transition via phase
            // phase: 'search_list' | 'detail_fetch' | 'done' | 'stopped' | 'error'
            const phase = data.phase || 'running';

            if (phase === 'done') {
                setStatus('COMPLETED');
            } else if (phase === 'error') {
                setStatus('ERROR');
            } else if (phase === 'stopped') {
                setStatus('IDLE'); // or COMPLETED with partial
                addLog('WARN', 'Stopped on server.');
            } else {
                setStatus('RUNNING');
            }

            // [FIX] Log from Message + Stable Timestamp
            // We do NOT use new Date() here. We use data.updatedAt from server.
            const serverTime = data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('ja-JP', { hour12: false }) : '';
            const msg = data.message || `Phase: ${phase}`;

            // Only update log if we have a message
            if (msg) {
                // We overwrite the logs with the latest server state + history if we kept it?
                // Since we don't get history from server, we just show the latest "Status" as a log entry
                // OR we append if it's different?
                // For safety and "clock" fix, let's just show the LATEST valid status from server.
                setLogs([{
                    timestamp: serverTime,
                    level: 'INFO',
                    message: msg // e.g. "詳細情報を収集中"
                }]);
            }

        } catch (e) {
            console.error('Poll Error', e);
        }
    };

    useEffect(() => {
        if (status === 'RUNNING') {
            intervalRef.current = window.setInterval(pollStatus, 2000);
        } else {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [status]);

    const startScraping = async (test = false) => {
        // [REAL API CALL]
        // Reset state first
        resetScraper();
        if (test) {
            setIsTestMode(true);
            setIsTestComplete(false);
        } else {
            setIsTestMode(false);
        }

        try {
            let targetUrl = 'https://jp.mercari.com/search?keyword=test';
            let limit = test ? 20 : 100;
            let excludeKeywords: string[] = [];
            let runType = test ? 'test' : 'production';

            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('merfox_settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.target?.url) targetUrl = parsed.target.url;
                    // For Production, respect the user setting. For Test, force 20.
                    if (!test && parsed.stopConditions?.countLimit) {
                        limit = parsed.stopConditions.countLimit;
                    }
                    if (parsed.filters?.excludeKeywords) {
                        excludeKeywords = parsed.filters.excludeKeywords;
                    }
                    if (parsed.runType) {
                        runType = parsed.runType;
                    }
                }
            }

            const res = await fetch('/api/scraper/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: targetUrl,
                    limit,
                    excludeKeywords,
                    runType
                })
            });
            const json = await res.json();

            if (json.success) {
                setLatestRunId(json.runId);
                setStatus('RUNNING');
                addLog('INFO', 'Scraping started (Real API)...');
            } else {
                addLog('ERROR', 'Failed to start: ' + json.error);
                setStatus('ERROR');
            }
        } catch (e) {
            addLog('ERROR', 'Network Error');
            setStatus('ERROR');
        }
    };

    const stopScraping = () => {
        // Stop polling
        setStatus('IDLE');
        addLog('WARN', 'Stopped by user.');
    };

    const pauseScraping = () => {
        setStatus('PAUSED');
        addLog('WARN', 'Paused.');
    };

    const resumeScraping = () => {
        setStatus('RUNNING');
        addLog('INFO', 'Resumed.');
    };

    const resetScraper = () => {
        setStatus('IDLE');
        setStats({ totalItems: 0, newItems: 0, excluded: { shops: 0, unknown: 0, shipping: 0, ngWord: 0, highPrice: 0 }, failed: 0 });
        setLogs([]);
        setIsTestComplete(false);
        setIsTestMode(false);
        setLatestRunId('');
    };

    return (
        <ScraperContext.Provider value={{
            status, stats, logs, currentUrl, isTestMode, isTestComplete,
            startScraping, stopScraping, pauseScraping, resumeScraping, resetScraper,
            latestRunId
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
