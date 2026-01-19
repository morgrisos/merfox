import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, shell } from 'electron';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

export function initUpdater() {
    // Auto-Update Disabled due to TLS/SSL blocking in user environment.
    // We strictly use manual updates via GitHub Releases.
    log.info('Auto-update disabled. Use manual update: https://github.com/morgrisos/merfox/releases');
}
