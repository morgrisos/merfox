import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fork, ChildProcess } from 'child_process';
import net from 'net';
import log from 'electron-log';
import fs from 'fs';
import { scraperManager } from '../lib/manager';
import { ScraperConfig } from '../lib/types';
import { initUpdater } from './updater';

// [LOGGING] Configure Electron Log (P9.21)
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.resolvePathFn = () => {
    return process.platform === 'darwin'
        ? path.join(app.getPath('home'), 'Library/Logs/merfox/main.log')
        : path.join(app.getPath('userData'), 'logs/main.log');
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        if (require('electron-squirrel-startup')) {
            app.quit();
        }
    } catch (e) {
        console.warn('Squirrel startup ignored:', e);
    }
}

const registerIpcHandlers = () => {
    // [MANUAL UPDATE] IPC Handlers for External Link & Version Check
    ipcMain.handle('app:get-version', () => {
        return app.getVersion();
    });

    ipcMain.handle('app:open-external', async (_, url: string) => {
        log.info('[IPC] app:open-external invoked with:', url);
        // Whitelist for GitHub Releases and Google Drive Mirror
        const ALLOWED_URLS = [
            'https://github.com/morgrisos/merfox/releases',
            'https://github.com/morgrisos/merfox/releases/latest',
            'https://drive.google.com/drive/folders/1uRY49dqN6NPydRJ1BvO0M2mtkY8_gBga?usp=sharing'
        ];

        if (ALLOWED_URLS.includes(url)) {
            await shell.openExternal(url);
            log.info('[IPC] app:open-external success');
        } else {
            log.warn(`[SECURITY] Blocked unauthorized openExternal request: ${url}`);
            console.warn(`[SECURITY] Blocked unauthorized openExternal request: ${url}`);
        }
    });

    ipcMain.handle('app:open-log-folder', async () => {
        log.info('[IPC] app:open-log-folder invoked');
        const logPath = process.platform === 'darwin'
            ? path.join(app.getPath('home'), 'Library/Logs/merfox')
            : path.join(app.getPath('userData'), 'logs');

        await shell.openPath(logPath);
    });

    ipcMain.handle('app:clear-logs', async () => {
        try {
            const logPath = process.platform === 'darwin'
                ? path.join(app.getPath('home'), 'Library/Logs/merfox/main.log')
                : path.join(app.getPath('userData'), 'logs/main.log');

            // Truncate file
            if (fs.existsSync(logPath)) {
                fs.writeFileSync(logPath, '');
                log.info('[SYSTEM] Logs cleared by user.');
                return { success: true };
            }
            return { success: false, reason: 'not_found' };
        } catch (e) {
            log.error('Failed to clear logs:', e);
            return { success: false, error: String(e) };
        }
    });

    // Scraper IPC Handlers
    ipcMain.handle('scraper:start', async (_, config: ScraperConfig) => {
        if (!config.outputDir) {
            const docs = app.getPath('documents');
            config.outputDir = path.join(docs, 'MerFoxResults');
        }
        await scraperManager.start(config);
        startStatusStream();
        return { success: true };
    });

    ipcMain.handle('scraper:stop', async () => {
        await scraperManager.stop();
        return { success: true };
    });

    ipcMain.handle('app:open-folder', async (_, dirPath?: string) => {
        if (dirPath) {
            await shell.openPath(dirPath);
        } else {
            const docs = app.getPath('documents');
            await shell.openPath(path.join(docs, 'MerFoxResults'));
        }
    });

    ipcMain.handle('app:open-file', async (_, filePath: string) => {
        await shell.openPath(filePath);
    });

    ipcMain.handle('app:get-log-path', () => {
        log.info('[IPC] app:get-log-path invoked');
        return process.platform === 'darwin'
            ? path.join(app.getPath('home'), 'Library/Logs/merfox/main.log')
            : path.join(app.getPath('userData'), 'logs', 'main.log');
    });
};

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const SERVER_PORT = 13337;

const startServer = async () => {
    if (process.env.NODE_ENV === 'development') return;

    const resourcesPath = path.join(__dirname, '../..'); // Root of unpacked app
    const nextBin = path.join(resourcesPath, 'node_modules/next/dist/bin/next');

    console.log('Starting Next.js Server via:', nextBin);

    serverProcess = fork(nextBin, ['start', '-p', `${SERVER_PORT}`], {
        cwd: resourcesPath,
        env: { ...process.env, NODE_ENV: 'production', PORT: `${SERVER_PORT}` },
        stdio: 'inherit' // Pipe logs for debugging
    });

    serverProcess.on('error', (err) => {
        console.error('Server failed to start:', err);
    });
};

const waitForServer = (port: number): Promise<void> => {
    return new Promise((resolve) => {
        const tryConnect = () => {
            const socket = new net.Socket();
            socket.on('connect', () => {
                socket.destroy();
                resolve();
            });
            socket.on('error', () => {
                socket.destroy();
                setTimeout(tryConnect, 200);
            });
            socket.connect(port, '127.0.0.1');
        };
        tryConnect();
    });
};

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset', // Mac style
        webPreferences: {
            preload: path.join(__dirname, './preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0a0a0c',
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // Production: Wait for server then load
        console.log('Waiting for backend server...');
        try {
            await waitForServer(SERVER_PORT);
            console.log('Server ready!');
            mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
        } catch (e) {
            console.error('Failed to connect to server:', e);
        }
    }
};

app.on('ready', async () => {
    // Register IPC Handlers immediately
    registerIpcHandlers();

    // Start Server and Create Window
    await startServer();
    createWindow();

    // Initialize Auto Updater
    initUpdater();
});


app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('window-all-closed', () => {
    scraperManager.stop().finally(() => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

let statusInterval: NodeJS.Timeout | null = null;
function startStatusStream() {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            if (statusInterval) clearInterval(statusInterval);
            return;
        }
        const stats = scraperManager.getStats();
        mainWindow.webContents.send('scraper:status', stats);
    }, 1000);
}
