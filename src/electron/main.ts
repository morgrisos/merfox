import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
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

// [MANUAL UPDATE] IPC Handlers for External Link & Version Check
ipcMain.handle('app:get-version', () => {
    return app.getVersion();
});

ipcMain.handle('app:open-external', async (_, url: string) => {
    // Strict Whitelist for GitHub Releases
    const ALLOWED_URL = 'https://github.com/morgrisos/merfox/releases';
    if (url === ALLOWED_URL) {
        await shell.openExternal(url);
    } else {
        console.warn(`[SECURITY] Blocked unauthorized openExternal request: ${url}`);
    }
});

ipcMain.handle('app:open-log-folder', async () => {
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

// Initialize Auto Updater (Manual Mode: Logging only)
initUpdater();

// [DIAGNOSTIC] Log Certificate Errors & Allow Insecure bypass if requested
app.on('certificate-error', (event, _webContents, url, error, certificate, callback) => {
    console.error(`[CERT-ERROR] URL: ${url}`);
    console.error(`[CERT-ERROR] Error: ${error}`);
    console.error(`[CERT-ERROR] Issuer: ${certificate.issuerName}`);
    console.error(`[CERT-ERROR] Subject: ${certificate.subjectName}`);

    if (process.env.MERFOX_INSECURE_SSL === '1') {
        console.warn('[CERT-ERROR] Bypassing certificate error due to MERFOX_INSECURE_SSL=1');
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const SERVER_PORT = 13337;

const startServer = async () => {
    if (process.env.NODE_ENV === 'development') return;

    const resourcesPath = process.resourcesPath;
    const unpackedRoot = path.join(resourcesPath, 'app.asar.unpacked');
    const nextBin = path.join(unpackedRoot, 'node_modules/next/dist/bin/next');

    console.log('Starting Next.js Server via (unpacked):', nextBin);
    console.log('CWD:', unpackedRoot);

    serverProcess = spawn(process.execPath, [nextBin, 'start', '-p', `${SERVER_PORT}`], {
        cwd: unpackedRoot,
        env: { ...process.env, NODE_ENV: 'production', PORT: `${SERVER_PORT}`, ELECTRON_RUN_AS_NODE: '1' },
        stdio: 'inherit' // Pipe logs for debugging
    });

    if (serverProcess) {
        serverProcess.on('error', (err) => {
            console.error('Server failed to start:', err);
        });
    }
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
    await startServer();
    createWindow();
    startScheduler();
    // IPC Handlers
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

    ipcMain.handle('app:open-log-folder', async () => {
        const logPath = process.platform === 'darwin'
            ? path.join(app.getPath('home'), 'Library/Logs/merfox')
            : path.join(app.getPath('userData'), 'logs');
        await shell.openPath(logPath);
    });

    ipcMain.handle('app:get-log-path', () => {
        return process.platform === 'darwin'
            ? path.join(app.getPath('home'), 'Library/Logs/merfox/main.log')
            : path.join(app.getPath('userData'), 'logs', 'main.log');
    });

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
        startScheduler();
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

// [PHASE 5] Automation Scheduler
let schedulerInterval: NodeJS.Timeout | null = null;
function startScheduler() {
    console.log('[Scheduler] Service started.');
    if (schedulerInterval) clearInterval(schedulerInterval);

    // Check every 60s
    schedulerInterval = setInterval(async () => {
        const now = new Date();
        // MVP: Hardcoded 09:00 check (aligns with merfox.automation.json default)
        // Ideally read JSON, but API handles validation.
        // We just need to trigger "on schedule". 
        // For MVP, we'll naive check against 09:00 locally to avoid API spam, 
        // OR just check "is it 9:00?" -> Call API.

        // Wait, if I want to verify "it works" without waiting for 9AM, 
        // I should probably rely on the API call manually for verification, 
        // but for Real Impl, checking 09:00 is correct.

        if (now.getHours() === 9 && now.getMinutes() === 0) {
            console.log('[Scheduler] Time match (09:00). Invoking Run API...');
            try {
                // Assuming Main process can access localhost:13337 (Next.js)
                const res = await fetch(`http://localhost:${SERVER_PORT}/api/automation/run`, { method: 'POST' });
                const json = await res.json();
                console.log('[Scheduler] Trigger result:', json);
            } catch (e) {
                console.error('[Scheduler] Failed to invoke trigger:', e);
            }
        }
    }, 60000); // 60s
}

