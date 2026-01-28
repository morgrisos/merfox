"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
// [HARDENING] Prevent Zombie Processes (v0.1.83) - REMOVED
// Reason: spawn() for Next.js server utilizes ELECTRON_RUN_AS_NODE, causing this guard to kill the backend.
// if (process.env.ELECTRON_RUN_AS_NODE === "1") { ... }
const child_process_1 = require("child_process");
const net_1 = __importDefault(require("net"));
const electron_log_1 = __importDefault(require("electron-log"));
const fs_1 = __importDefault(require("fs"));
// PANIC HANDLER - DEPENDENCY FREE
const PANIC_LOG = path_1.default.join(process.env.HOME || '/tmp', 'merfox-panic.log');
const panicLog = (msg) => {
    try {
        fs_1.default.appendFileSync(PANIC_LOG, `[${new Date().toISOString()}] ${msg}\n`);
    }
    catch (_) { }
};
panicLog(`[START] Main process execution started. PID: ${process.pid}`);
process.on('uncaughtException', (err) => {
    panicLog('uncaughtException');
    panicLog(err && err.stack ? err.stack : String(err));
    process.exit(1); // Standard exit on panic
});
process.on('unhandledRejection', (reason) => {
    panicLog('unhandledRejection');
    panicLog(String(reason));
});
const manager_1 = require("../lib/manager");
const updater_1 = require("./updater");
// [LOGGING] Configure Electron Log (P9.21)
try {
    electron_log_1.default.transports.file.level = 'info';
    electron_log_1.default.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
    electron_log_1.default.transports.file.resolvePathFn = () => {
        return process.platform === 'darwin'
            ? path_1.default.join(electron_1.app.getPath('home'), 'Library/Logs/merfox/main.log')
            : path_1.default.join(electron_1.app.getPath('userData'), 'logs/main.log');
    };
}
catch (e) {
    console.error('Log config failed:', e);
}
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        if (require('electron-squirrel-startup')) {
            electron_1.app.quit();
        }
    }
    catch (e) {
        console.warn('Squirrel startup ignored:', e);
    }
}
// [MANUAL UPDATE] IPC Handlers for External Link & Version Check
electron_1.ipcMain.handle('app:get-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('app:open-external', async (_, url) => {
    // Strict Whitelist for GitHub Releases
    const ALLOWED_URL = 'https://github.com/morgrisos/merfox/releases';
    if (url === ALLOWED_URL) {
        await electron_1.shell.openExternal(url);
    }
    else {
        console.warn(`[SECURITY] Blocked unauthorized openExternal request: ${url}`);
    }
});
electron_1.ipcMain.handle('app:open-log-folder', async () => {
    const logPath = process.platform === 'darwin'
        ? path_1.default.join(electron_1.app.getPath('home'), 'Library/Logs/merfox')
        : path_1.default.join(electron_1.app.getPath('userData'), 'logs');
    await electron_1.shell.openPath(logPath);
});
electron_1.ipcMain.handle('app:clear-logs', async () => {
    try {
        const logPath = process.platform === 'darwin'
            ? path_1.default.join(electron_1.app.getPath('home'), 'Library/Logs/merfox/main.log')
            : path_1.default.join(electron_1.app.getPath('userData'), 'logs/main.log');
        // Truncate file
        if (fs_1.default.existsSync(logPath)) {
            fs_1.default.writeFileSync(logPath, '');
            electron_log_1.default.info('[SYSTEM] Logs cleared by user.');
            return { success: true };
        }
        return { success: false, reason: 'not_found' };
    }
    catch (e) {
        electron_log_1.default.error('Failed to clear logs:', e);
        return { success: false, error: String(e) };
    }
});
// Initialize Auto Updater (Manual Mode: Logging only)
(0, updater_1.initUpdater)();
// [DIAGNOSTIC] Log Certificate Errors & Allow Insecure bypass if requested
electron_1.app.on('certificate-error', (event, _webContents, url, error, certificate, callback) => {
    console.error(`[CERT-ERROR] URL: ${url}`);
    console.error(`[CERT-ERROR] Error: ${error}`);
    console.error(`[CERT-ERROR] Issuer: ${certificate.issuerName}`);
    console.error(`[CERT-ERROR] Subject: ${certificate.subjectName}`);
    if (process.env.MERFOX_INSECURE_SSL === '1') {
        console.warn('[CERT-ERROR] Bypassing certificate error due to MERFOX_INSECURE_SSL=1');
        event.preventDefault();
        callback(true);
    }
    else {
        callback(false);
    }
});
let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 13337;
// DIAGNOSTIC GLOBAL
let logDir = '';
let bootLog = '';
let nextOut = '';
let nextErr = '';
const initLogs = () => {
    try {
        logDir = electron_1.app.getPath('userData');
        if (!fs_1.default.existsSync(logDir))
            fs_1.default.mkdirSync(logDir, { recursive: true });
        bootLog = path_1.default.join(logDir, 'merfox-boot.log');
        nextOut = path_1.default.join(logDir, 'merfox-next.stdout.log');
        nextErr = path_1.default.join(logDir, 'merfox-next.stderr.log');
        fs_1.default.appendFileSync(bootLog, `\n[${new Date().toISOString()}] [GLOBAL] Main process loaded. PID: ${process.pid}\n`);
    }
    catch (e) {
        console.error('Failed to init logs:', e);
    }
};
const startServer = async () => {
    // DIAGNOSTIC PATCH: Remove development check for production debugging if needed
    if (process.env.NODE_ENV === 'development')
        return;
    if (!bootLog)
        initLogs(); // Safety fallback
    try {
        fs_1.default.appendFileSync(bootLog, `[BOOT] startServer entered\n`);
        fs_1.default.appendFileSync(bootLog, `[DEBUG] app.getAppPath: ${electron_1.app.getAppPath()}\n`);
        fs_1.default.appendFileSync(bootLog, `[DEBUG] resourcesPath: ${process.resourcesPath}\n`);
    }
    catch (e) {
        console.error('Log write failed', e);
    }
    const resourcesPath = process.resourcesPath;
    const serverDir = electron_1.app.isPackaged
        ? path_1.default.join(resourcesPath, 'standalone')
        : path_1.default.join(__dirname, '../../.next/standalone');
    const standaloneServer = path_1.default.join(serverDir, 'server.js');
    try {
        fs_1.default.appendFileSync(bootLog, `[DEBUG] serverDir: ${serverDir}\n`);
        fs_1.default.appendFileSync(bootLog, `[DEBUG] standaloneServer Target: ${standaloneServer}\n`);
    }
    catch (_) { }
    const serverExists = fs_1.default.existsSync(standaloneServer);
    try {
        fs_1.default.appendFileSync(bootLog, `[DEBUG] standaloneServer Exists: ${serverExists}\n`);
    }
    catch (_) { }
    if (!serverExists) {
        console.error('[FATAL] Standalone server missing');
        try {
            fs_1.default.appendFileSync(bootLog, `[FATAL] Standalone server missing at ${standaloneServer}\n`);
            if (electron_1.app.isPackaged) {
                const contents = fs_1.default.readdirSync(resourcesPath);
                fs_1.default.appendFileSync(bootLog, `[DEBUG] resourcesPath contents: ${contents.join(', ')}\n`);
            }
        }
        catch (e) {
            try {
                fs_1.default.appendFileSync(bootLog, `[ERROR] Failed to list resources: ${e}\n`);
            }
            catch (_) { }
        }
    }
    // Prepare logs - use file descriptor to ensure flush
    let outStream, errStream;
    try {
        outStream = fs_1.default.openSync(nextOut, 'a');
        errStream = fs_1.default.openSync(nextErr, 'a');
    }
    catch (e) {
        try {
            fs_1.default.appendFileSync(bootLog, `[ERROR] Failed to open streams: ${e}\n`);
        }
        catch (_) { }
    }
    console.log('Starting Next.js Standalone Server via:', standaloneServer);
    try {
        fs_1.default.appendFileSync(bootLog, `[INFO] Spawning node process...\n`);
    }
    catch (_) { }
    try {
        serverProcess = (0, child_process_1.spawn)(process.execPath, [standaloneServer], {
            cwd: serverDir,
            env: {
                ...process.env,
                NODE_ENV: 'production',
                PORT: `${SERVER_PORT}`,
                ELECTRON_RUN_AS_NODE: '1',
                MERFOX_USER_DATA: electron_1.app.getPath('userData'),
                MERFOX_RUNS_DIR: path_1.default.join(electron_1.app.getPath('userData'), 'MerFox/runs')
            },
            stdio: ['ignore', outStream || 'ignore', errStream || 'ignore']
        });
        try {
            fs_1.default.appendFileSync(bootLog, `[INFO] Spawned. PID: ${serverProcess.pid}\n`);
        }
        catch (_) { }
        if (serverProcess) {
            serverProcess.on('error', (err) => {
                console.error('Server failed to start:', err);
                if (errStream) {
                    try {
                        fs_1.default.writeSync(errStream, `\n[LAUNCH ERROR] ${err}\n`);
                    }
                    catch (_) { }
                }
                try {
                    fs_1.default.appendFileSync(bootLog, `[ERROR] Spawn error: ${err}\n`);
                }
                catch (_) { }
            });
            serverProcess.on('exit', (code, signal) => {
                if (errStream) {
                    try {
                        fs_1.default.writeSync(errStream, `\n[EXIT] Code: ${code}, Signal: ${signal}\n`);
                    }
                    catch (_) { }
                }
                try {
                    fs_1.default.appendFileSync(bootLog, `[EXIT] Server exited. Code: ${code}, Signal: ${signal}\n`);
                }
                catch (_) { }
            });
        }
    }
    catch (e) {
        try {
            fs_1.default.appendFileSync(bootLog, `[CRITICAL] Exception during spawn: ${e}\n`);
        }
        catch (_) { }
    }
};
const waitForServer = (port, timeoutMs = 20000) => {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const tryConnect = () => {
            if (Date.now() - started > timeoutMs) {
                reject(new Error(`waitForServer timeout ${timeoutMs}ms`));
                return;
            }
            const socket = new net_1.default.Socket();
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
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hiddenInset', // Mac style
        webPreferences: {
            preload: path_1.default.join(__dirname, './preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        backgroundColor: '#0a0a0c',
    });
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        // Production: Wait for server then load
        console.log('Waiting for backend server...');
        try {
            await waitForServer(SERVER_PORT, 20000);
            console.log('Server ready!');
            mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
        }
        catch (e) {
            console.error('Failed to connect to server:', e);
            try {
                fs_1.default.appendFileSync(bootLog, `[FATAL] waitForServer failed: ${e}\n`);
            }
            catch (_) { }
            mainWindow.loadURL(`data:text/plain,MerFox backend failed to start. See logs in userData.`);
        }
    }
};
electron_1.app.on('ready', async () => {
    initLogs(); // Initialize logs safely AFTER app is ready
    await startServer();
    createWindow();
    startScheduler();
    // IPC Handlers
    electron_1.ipcMain.handle('scraper:start', async (_, config) => {
        if (!config.outputDir) {
            const docs = electron_1.app.getPath('documents');
            config.outputDir = path_1.default.join(docs, 'MerFoxResults');
        }
        await manager_1.scraperManager.start(config);
        startStatusStream();
        return { success: true };
    });
    electron_1.ipcMain.handle('scraper:stop', async () => {
        await manager_1.scraperManager.stop();
        return { success: true };
    });
    electron_1.ipcMain.handle('app:open-folder', async (_, dirPath) => {
        if (dirPath) {
            await electron_1.shell.openPath(dirPath);
        }
        else {
            const docs = electron_1.app.getPath('documents');
            await electron_1.shell.openPath(path_1.default.join(docs, 'MerFoxResults'));
        }
    });
    electron_1.ipcMain.handle('app:open-file', async (_, filePath) => {
        await electron_1.shell.openPath(filePath);
    });
    electron_1.ipcMain.handle('app:open-log-folder', async () => {
        const logPath = process.platform === 'darwin'
            ? path_1.default.join(electron_1.app.getPath('home'), 'Library/Logs/merfox')
            : path_1.default.join(electron_1.app.getPath('userData'), 'logs');
        await electron_1.shell.openPath(logPath);
    });
    electron_1.ipcMain.handle('app:get-log-path', () => {
        return process.platform === 'darwin'
            ? path_1.default.join(electron_1.app.getPath('home'), 'Library/Logs/merfox/main.log')
            : path_1.default.join(electron_1.app.getPath('userData'), 'logs', 'main.log');
    });
    // Initialize Auto Updater
    (0, updater_1.initUpdater)();
});
electron_1.app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
electron_1.app.on('window-all-closed', () => {
    manager_1.scraperManager.stop().finally(() => {
        if (process.platform !== 'darwin') {
            electron_1.app.quit();
        }
    });
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        startScheduler();
    }
});
let statusInterval = null;
function startStatusStream() {
    if (statusInterval)
        clearInterval(statusInterval);
    statusInterval = setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            if (statusInterval)
                clearInterval(statusInterval);
            return;
        }
        const stats = manager_1.scraperManager.getStats();
        mainWindow.webContents.send('scraper:status', stats);
    }, 1000);
}
// [PHASE 5] Automation Scheduler
let schedulerInterval = null;
function startScheduler() {
    console.log('[Scheduler] Service started.');
    if (schedulerInterval)
        clearInterval(schedulerInterval);
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
            }
            catch (e) {
                console.error('[Scheduler] Failed to invoke trigger:', e);
            }
        }
    }, 60000); // 60s
}
