import { useState, useEffect } from 'react';
import { RunRecord } from '../types';

const STORAGE_KEY = 'merfox_run_history';

export const useRunHistory = () => {
    const [history, setHistory] = useState<RunRecord[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse run history', e);
            }
        }
    }, []);

    const saveHistory = (newHistory: RunRecord[]) => {
        setHistory(newHistory);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    };

    const addRecord = (record: RunRecord) => {
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
