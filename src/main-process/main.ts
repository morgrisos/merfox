import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import * as logger from './logger';
import { showRecoveryWindow, setupRecoveryHandlers } from './recoveryWindow';

// PANIC HANDLER - DEPENDENCY FREE (keep for catastrophic failures)
const PANIC_LOG = path.join(process.env.HOME || '/tmp', 'merfox-panic.log');

const panicLog = (msg: string) => {
    try {
        fs.appendFileSync(PANIC_LOG, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (_) { }
};

panicLog(`[START] Main process execution started. PID: ${process.pid}`);

process.on('uncaughtException', (err: Error) => {
    panicLog('uncaughtException');
    panicLog(err && err.stack ? err.stack : String(err));
    logger.error('Uncaught exception', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    panicLog('unhandledRejection');
    panicLog(String(reason));
    logger.error(`Unhandled rejection: ${String(reason)}`);
});

import { scraperManager } from '../lib/manager';
import { ScraperConfig } from '../lib/types';
import { initUpdater } from './updater';

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
    const ALLOWED_URL = 'https://github.com/morgrisos/merfox/releases';
    if (url === ALLOWED_URL) {
        await shell.openExternal(url);
    } else {
        logger.warn(`[SECURITY] Blocked unauthorized openExternal request: ${url}`);
    }
});

ipcMain.handle('app:open-log-folder', async () => {
    await shell.openPath(logger.getLogDir());
});

ipcMain.handle('app:clear-logs', async () => {
    try {
        const logPath = logger.getLogPath();
        if (fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '');
            logger.info('[SYSTEM] Logs cleared by user.');
            return { success: true };
        }
        return { success: false, reason: 'not_found' };
    } catch (e) {
        logger.error('Failed to clear logs', e as Error);
        return { success: false, error: String(e) };
    }
});

ipcMain.handle('app:get-log-path', () => {
    return logger.getLogPath();
});

// [DIAGNOSTIC] Log Certificate Errors
app.on('certificate-error', (event, _webContents, url, error, certificate, callback) => {
    logger.error(`[CERT-ERROR] URL: ${url}, Error: ${error}`);
    logger.error(`[CERT-ERROR] Issuer: ${certificate.issuerName}, Subject: ${certificate.subjectName}`);

    if (process.env.MERFOX_INSECURE_SSL === '1') {
        logger.warn('[CERT-ERROR] Bypassing certificate error due to MERFOX_INSECURE_SSL=1');
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

// [v0.43.0] Server Configuration
let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const SERVER_PORT = process.env.MERFOX_PORT ? parseInt(process.env.MERFOX_PORT, 10) : 13337;
let startupRetryCount = 0;
const MAX_STARTUP_RETRIES = 2;

/**
 * Start the Next.js standalone server
 */
const startServer = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
        logger.info('[Server] Skipping server start in development mode');
        return;
    }

    logger.info(`[Server] Starting server on port ${SERVER_PORT}...`);

    const resourcesPath = process.resourcesPath;
    const serverDir = app.isPackaged
        ? path.join(resourcesPath, 'standalone')
        : path.join(__dirname, '../../.next/standalone');
    const standaloneServer = path.join(serverDir, 'server.js');

    logger.info(`[Server] Server directory: ${serverDir}`);
    logger.info(`[Server] Standalone server: ${standaloneServer}`);

    const serverExists = fs.existsSync(standaloneServer);
    logger.info(`[Server] Standalone server exists: ${serverExists}`);

    if (!serverExists) {
        logger.error(`[Server] FATAL: Standalone server missing at ${standaloneServer}`);
        if (app.isPackaged) {
            try {
                const contents = fs.readdirSync(resourcesPath);
                logger.error(`[Server] resourcesPath contents: ${contents.join(', ')}`);
            } catch (e) {
                logger.error(`[Server] Failed to list resources: ${String(e)}`);
            }
        }
        throw new Error('Standalone server missing');
    }

    // [PORT GUARD] Check for port conflict (WARNING ONLY - no auto-kill)
    // v0.43.1: Changed from auto-kill to warning-only to allow Recovery UI display
    try {
        const checkCmd = `lsof -t -i:${SERVER_PORT} -sTCP:LISTEN`;
        let pidsOccupying = '';
        try {
            pidsOccupying = require('child_process').execSync(checkCmd, { encoding: 'utf8' }).trim();
        } catch (e) {
            // No process found
        }

        if (pidsOccupying) {
            const pids = pidsOccupying.split('\n').filter(p => p.trim());
            logger.warn(`[PortGuard] Port ${SERVER_PORT} occupied by PIDs: ${pids.join(',')}.`);
            logger.warn(`[PortGuard] Auto-kill is disabled. Will attempt to start and rely on Recovery UI if it fails.`);
            // DO NOT KILL - let natural EADDRINUSE occur and trigger recovery flow
        } else {
            logger.info(`[PortGuard] Port ${SERVER_PORT} appears free.`);
        }
    } catch (e) {
        logger.warn(`[PortGuard] Port guard check failed: ${String(e)}`);
    }

    // Spawn server process
    try {
        serverProcess = spawn(process.execPath, [standaloneServer], {
            cwd: serverDir,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                PORT: `${SERVER_PORT}`,
                ELECTRON_RUN_AS_NODE: '1',
                MERFOX_USER_DATA: app.getPath('userData'),
                MERFOX_RUNS_DIR: path.join(app.getPath('userData'), 'MerFox/runs')
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        logger.info(`[Server] Spawned. PID: ${serverProcess.pid}`);

        if (serverProcess.stdout) {
            serverProcess.stdout.on('data', (data) => {
                logger.info(`[Next.js] ${data.toString().trim()}`);
            });
        }

        if (serverProcess.stderr) {
            serverProcess.stderr.on('data', (data) => {
                const msg = data.toString().trim();
                // Check for EADDRINUSE
                if (msg.includes('EADDRINUSE')) {
                    logger.error(`[Server] EADDRINUSE detected: Port ${SERVER_PORT} is in use`);
                }
                logger.error(`[Next.js Error] ${msg}`);
            });
        }

        serverProcess.on('error', (err) => {
            logger.error(`[Server] Spawn error: ${String(err)}`, err);
        });

        serverProcess.on('exit', (code, signal) => {
            logger.info(`[Server] Server exited. Code: ${code}, Signal: ${signal}`);
        });
    } catch (e) {
        logger.error(`[Server] CRITICAL: Exception during spawn: ${String(e)}`);
        throw e;
    }
};

/**
 * Health check: GET /api/version with retry logic
 * Returns true if server is healthy, false otherwise
 */
const healthCheck = async (port: number, timeoutMs = 10000): Promise<boolean> => {
    logger.info(`[HealthCheck] Starting health check on port ${port}...`);
    const startTime = Date.now();
    const url = `http://127.0.0.1:${port}/api/version`;

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                logger.info(`[HealthCheck] Server healthy! Version: ${data.version}`);
                return true;
            }
        } catch (e) {
            // Retry
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    logger.error(`[HealthCheck] Health check failed after ${timeoutMs}ms`);
    return false;
};

/**
 * Start server with automatic recovery
 */
const startServerWithRecovery = async (): Promise<void> => {
    startupRetryCount++;
    logger.info(`[Recovery] Startup attempt ${startupRetryCount}/${MAX_STARTUP_RETRIES}`);

    try {
        await startServer();

        // Wait for server to become healthy
        const healthy = await healthCheck(SERVER_PORT, 10000);

        if (!healthy) {
            throw new Error('Server failed health check');
        }

        logger.info('[Recovery] Server started successfully!');
        startupRetryCount = 0; // Reset on success
    } catch (e) {
        logger.error(`[Recovery] Server startup failed: ${String(e)}`);

        // Kill existing server process if any
        if (serverProcess) {
            logger.info('[Recovery] Killing existing server process...');
            serverProcess.kill();
            serverProcess = null;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Retry if under limit
        if (startupRetryCount < MAX_STARTUP_RETRIES) {
            logger.warn(`[Recovery] Retrying startup... (${startupRetryCount}/${MAX_STARTUP_RETRIES})`);
            return startServerWithRecovery();
        } else {
            // Max retries exceeded - show recovery UI
            logger.error('[Recovery] Max retries exceeded. Showing recovery UI.');
            const errorCode = String(e).includes('EADDRINUSE') ? 'EADDRINUSE' : undefined;
            showRecoveryWindow({
                reason: `サーバーの起動に失敗しました: ${String(e)}`,
                port: SERVER_PORT,
                logPath: logger.getLogPath(),
                errorCode
            });
            throw e;
        }
    }
};

const createWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset',
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
        // Production: Load from local server
        logger.info(`[Window] Loading from http://localhost:${SERVER_PORT}`);
        mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    }
};

app.on('ready', async () => {
    logger.initLogger();
    logger.info('[App] App ready event fired');

    // Setup recovery handlers
    setupRecoveryHandlers(async () => {
        logger.info('[Recovery] User requested retry');
        startupRetryCount = 0; // Reset counter
        await startServerWithRecovery();
        if (mainWindow) {
            mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
        }
    });

    try {
        await startServerWithRecovery();
        await createWindow();
        startScheduler();
    } catch (e) {
        logger.error(`[App] Failed to start application: ${String(e)}`);
        // Recovery UI already shown by startServerWithRecovery
    }

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
    logger.info('[Scheduler] Service started.');
    if (schedulerInterval) clearInterval(schedulerInterval);

    schedulerInterval = setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 9 && now.getMinutes() === 0) {
            logger.info('[Scheduler] Time match (09:00). Invoking Run API...');
            try {
                const res = await fetch(`http://localhost:${SERVER_PORT}/api/automation/run`, { method: 'POST' });
                const json = await res.json();
                logger.info(`[Scheduler] Trigger result: ${JSON.stringify(json)}`);
            } catch (e) {
                logger.error(`[Scheduler] Failed to invoke trigger: ${String(e)}`);
            }
        }
    }, 60000); // 60s
}
