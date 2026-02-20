import { useState, useEffect } from 'react';
import { RunRecord } from '../types';


export const useRunHistory = () => {
    const [history, setHistory] = useState<RunRecord[]>([]);

    useEffect(() => {
        // [FIX] Fetch from API instead of localStorage
        fetch('/api/runs')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Map API response to RunRecord
                    const mapped: RunRecord[] = data.map((r: any) => ({
                        id: r.id,
                        date: r.date,
                        status: r.stats.success > 0 ? 'completed' : 'failed',
                        targetUrl: '(Auto/Server)',
                        platform: 'mercari',
                        mode: 'onetime',
                        stats: {
                            total: r.stats.totalScanned || 0,
                            success: r.stats.success || 0,
                            failed: r.stats.failed || 0,
                            excluded: r.stats.excluded || 0
                        },
                        logs: [],
                        failureReasons: r.failureReasons || [],
                        failedUrls: r.failedUrls || [],
                        configExists: r.configExists || false
                    }));
                    setHistory(mapped);
                }
            })
            .catch(e => console.error('Failed to fetch runs', e));
    }, []);

    const saveHistory = (newHistory: RunRecord[]) => {
        setHistory(newHistory);
        // [Optional] Could persist to localStorage as cache, but let's stick to API for truth.
    };

    const addRecord = (record: RunRecord) => {
        // For now, UI-only addition (until we implement POST /api/runs/create fully in Dashboard)
        const newHistory = [record, ...history];
        saveHistory(newHistory);
    };

    const updateRecord = (id: string, updates: Partial<RunRecord>) => {
        const newHistory = history.map(rec =>
            rec.id === id ? { ...rec, ...updates } : rec
        );
        saveHistory(newHistory);
    };

    const getRecord = (id: string) => {
        return history.find(rec => rec.id === id);
    };

    const clearHistory = () => {
        saveHistory([]);
    };

    return {
        history,
        addRecord,
        updateRecord,
        getRecord,
        clearHistory
    };
};
