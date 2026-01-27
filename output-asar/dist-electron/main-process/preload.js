"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    start: (config) => electron_1.ipcRenderer.invoke('scraper:start', config),
    stop: () => electron_1.ipcRenderer.invoke('scraper:stop'),
    onStatus: (callback) => {
        const subscription = (_, stats) => callback(stats);
        electron_1.ipcRenderer.on('scraper:status', subscription);
        return () => electron_1.ipcRenderer.removeListener('scraper:status', subscription);
    },
    openFolder: (path) => electron_1.ipcRenderer.invoke('app:open-folder', path),
    openFile: (path) => electron_1.ipcRenderer.invoke('app:open-file', path),
    openLogFolder: () => electron_1.ipcRenderer.invoke('app:open-log-folder'),
    getLogPath: () => electron_1.ipcRenderer.invoke('app:get-log-path'),
    clearLogs: () => electron_1.ipcRenderer.invoke('app:clear-logs'),
});
electron_1.contextBridge.exposeInMainWorld('merfox', {
    openExternal: (url) => electron_1.ipcRenderer.invoke('app:open-external', url),
    getAppVersion: () => electron_1.ipcRenderer.invoke('app:get-version'),
    openLogFolder: () => electron_1.ipcRenderer.invoke('app:open-log-folder'),
});
