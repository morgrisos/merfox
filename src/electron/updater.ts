import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { dialog, BrowserWindow, shell } from 'electron';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

export function initUpdater() {
    // Disable auto-download if you want full manual control, 
    // but user requested "Download completed -> Restart button", implies autoDownload=true is fine or convenient.
    // We'll trust autoDownload=true (default) and just handle the 'update-downloaded' event.
    autoUpdater.autoDownload = true;

    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('Update available.', info);
        // Optional: Notify user update is downloading
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available.', info);
    });

    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater. ', err);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded', info);

        dialog.showMessageBox({
            type: 'info',
            title: 'アップデートあり',
            message: `新しいバージョン (v${info.version}) が利用可能です。\n再起動して適用しますか？`,
            buttons: ['再起動して適用', '後で'],
            defaultId: 0
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    // Initial check (delayed to allow app to start)
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
            log.error('Failed to check for updates:', err);
        });
    }, 5000);
}
