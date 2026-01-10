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
    currentUrl: string; // Mock current url being processed
    isTestMode: boolean; // Running 20 items test
    isTestComplete: boolean; // Test finished successfully
    startScraping: (testMode?: boolean) => void;
    stopScraping: () => void;
    pauseScraping: () => void;
    resumeScraping: () => void;
    resetScraper: () => void;
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

    const intervalRef = useRef<number | null>(null);

    const addLog = (level: LogEntry['level'], message: string) => {
        const timestamp = new Date().toLocaleTimeString('ja-JP', { hour12: false });
        setLogs(prev => [...prev.slice(-99), { timestamp, level, message }]); // Keep last 100
    };

    const runMockCycle = () => {
        // Mock scraping logic
        const actions = [
            () => {
                const id = Math.floor(Math.random() * 900000) + 100000;
                setCurrentUrl(`https://jp.mercari.com/item/m${id}`);
                addLog('INFO', `ページ m${id} を解析中...`);
            },
            () => {
                // Determine outcome
                const rand = Math.random();
                if (rand < 0.1) {
                    addLog('WARN', 'Shops出品のため除外しました');
                    setStats(prev => ({ ...prev, totalItems: prev.totalItems + 1, excluded: { ...prev.excluded, shops: prev.excluded.shops + 1 } }));
                } else if (rand < 0.2) {
                    addLog('WARN', '送料着払いのため除外しました');
                    setStats(prev => ({ ...prev, totalItems: prev.totalItems + 1, excluded: { ...prev.excluded, shipping: prev.excluded.shipping + 1 } }));
                } else if (rand < 0.8) {
                    addLog('SUCCESS', 'データを抽出完了。Raw CSVに保存しました。');
                    setStats(prev => ({ ...prev, totalItems: prev.totalItems + 1, newItems: prev.newItems + 1 }));
                } else {
                    addLog('ERROR', '解析エラー: Dom structure mismatch');
                    setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
                }
            }
        ];

        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
    };

    useEffect(() => {
        if (status === 'RUNNING') {
            intervalRef.current = window.setInterval(() => {
                runMockCycle();

                // Test Mode Limit
                if (isTestMode) {
                    setStats(currentStats => {
                        if (currentStats.newItems >= 20) {
                            pauseScraping(); // Pause internally but logically complete
                            setStatus('IDLE'); // Actually stop
                            setIsTestComplete(true);
                            addLog('SUCCESS', 'テスト実行完了 (20件)。本番実行が可能です。');
                            return currentStats;
                        }
                        return currentStats;
                    });
                }
            }, 800); // Fast mock
        } else {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, [status, isTestMode]);

    const startScraping = (test = false) => {
        if (test) {
            resetScraper(); // Reset for test
            setIsTestMode(true);
            setIsTestComplete(false);
            addLog('INFO', 'テスト実行を開始します (目標: 20件)...');
        } else {
            if (!isTestComplete && stats.newItems === 0) { // Simple guard
                // In real app, we check confirmation. Here we just assume "Real Run"
                setIsTestMode(false);
                addLog('INFO', '本番実行を開始します...');
            } else {
                addLog('INFO', '実行を再開します...');
            }
        }
        setStatus('RUNNING');
    };

    const stopScraping = () => {
        setStatus('IDLE');
        addLog('WARN', 'ユーザーにより停止されました。');
    };

    const pauseScraping = () => {
        setStatus('PAUSED');
        addLog('WARN', '一時停止しました。');
    };

    const resumeScraping = () => {
        setStatus('RUNNING');
        addLog('INFO', '再開しました。');
    };

    const resetScraper = () => {
        setStatus('IDLE');
        setStats({ totalItems: 0, newItems: 0, excluded: { shops: 0, unknown: 0, shipping: 0, ngWord: 0, highPrice: 0 }, failed: 0 });
        setLogs([]);
        setIsTestComplete(false);
        setIsTestMode(false);
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
