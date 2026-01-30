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
    const [currentUrl, setCurrentUrl] = useState('');
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

            // Update Logs
            if (data.log && data.log.tail) {
                const newLogs = data.log.tail.map((line: string) => {
                    return { timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: line } as LogEntry;
                });
                // Replace logs (assuming tail gives latest context)
                setLogs(newLogs.reverse());
            }

            // Update Status/Stats
            if (data.status === 'completed' || data.status === 'success') {
                setStatus('COMPLETED');
                if (data.summary) {
                    setStats(prev => ({
                        ...prev,
                        totalItems: data.summary.total || 0,
                        newItems: data.summary.success || 0,
                        failed: data.summary.failed || 0
                    }));
                }
            } else if (data.status === 'running') {
                setStatus('RUNNING');
                if (data.summary) {
                    setStats(prev => ({
                        ...prev,
                        totalItems: data.summary.total || 0,
                        newItems: data.summary.success || 0
                    }));
                }
            } else if (data.status === 'error') {
                setStatus('ERROR');
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
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('merfox_settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.target?.url) targetUrl = parsed.target.url;
                }
            }

            const res = await fetch('/api/scraper/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl, limit: test ? 20 : 100 })
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
