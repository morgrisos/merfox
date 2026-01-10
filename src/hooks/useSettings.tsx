import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings, DEFAULT_SETTINGS, PresetMode } from '../lib/types';

type SettingsContextType = {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    resetSettings: () => void;
    applyPreset: (mode: PresetMode) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem('merfox_settings');
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('merfox_settings', JSON.stringify(settings));
    }, [settings]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    const applyPreset = (mode: PresetMode) => {
        if (mode === 'beginner') {
            setSettings(prev => ({
                ...prev,
                preset: 'beginner',
                collectionMode: 'watch',
                watchInterval: 25,
                filters: {
                    ...prev.filters,
                    excludeShops: true,
                    excludeUnknown: true,
                    onlyFreeShipping: true,
                },
                stopConditions: {
                    useCount: true,
                    countLimit: 1000,
                    useTime: true,
                    timeLimit: 25
                }
            }));
        } else {
            setSettings(prev => ({ ...prev, preset: 'custom' }));
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, applyPreset }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
