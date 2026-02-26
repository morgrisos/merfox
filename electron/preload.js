const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openRunsDir: () => ipcRenderer.invoke('openRunsDir'),
    // [P0-1] Listing defaults persistence (userData/listing_defaults.json)
    getListingDefaults: () => ipcRenderer.invoke('getListingDefaults'),
    saveListingDefaults: (data) => ipcRenderer.invoke('saveListingDefaults', data),
});
