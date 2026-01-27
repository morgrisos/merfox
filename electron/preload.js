const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openRunsDir: () => ipcRenderer.invoke('openRunsDir'),
});
