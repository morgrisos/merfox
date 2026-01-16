import { contextBridge, ipcRenderer } from 'electron';
import { ScraperConfig, ExecutionStats } from '../lib/types';

contextBridge.exposeInMainWorld('electron', {
    start: (config: ScraperConfig) => ipcRenderer.invoke('scraper:start', config),
    stop: () => ipcRenderer.invoke('scraper:stop'),
    onStatus: (callback: (stats: ExecutionStats) => void) => {
        const subscription = (_: any, stats: ExecutionStats) => callback(stats);
        ipcRenderer.on('scraper:status', subscription);
        return () => ipcRenderer.removeListener('scraper:status', subscription);
    },
    openFolder: (path?: string) => ipcRenderer.invoke('app:open-folder', path),
    openFile: (path: string) => ipcRenderer.invoke('app:open-file', path),
    openLogFolder: () => ipcRenderer.invoke('app:open-log-folder'),
    getLogPath: () => ipcRenderer.invoke('app:get-log-path'),
    clearLogs: () => ipcRenderer.invoke('app:clear-logs'),
});

contextBridge.exposeInMainWorld('merfox', {
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
    getAppVersion: () => ipcRenderer.invoke('app:get-version'),
    openLogFolder: () => ipcRenderer.invoke('app:open-log-folder'),
});
