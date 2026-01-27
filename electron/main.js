import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let serverProcess;
const SERVER_PORT = 3001;
const DEV_UI_URL = 'http://localhost:3000';
const PROD_UI_URL = `http://localhost:${SERVER_PORT}`;

// P8.8.3: Squirrel Startup (Win32 Only)
if (process.platform === 'win32') {
    if (require('electron-squirrel-startup')) app.quit();
}

// P5.5: Robust Server Kill Logic (Zombie Prevention)
function killServer() {
    if (serverProcess) {
        console.log(`[Electron] Killing Server (PID: ${serverProcess.pid})...`);
        serverProcess.kill('SIGTERM');
        // Force kill if still alive after 2s
        setTimeout(() => {
            try {
                process.kill(serverProcess.pid, 0); // Check if alive
                console.log('[Electron] Server still alive, force killing (SIGKILL)...');
                serverProcess.kill('SIGKILL');
            } catch (e) {
                // Process likely dead
            }
        }, 2000);
        serverProcess = null;
    }
}

app.on('before-quit', killServer);
app.on('will-quit', killServer);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const targetUrl = app.isPackaged ? PROD_UI_URL : DEV_UI_URL;
    console.log(`[Electron] Loading UI from: ${targetUrl} (Packaged: ${app.isPackaged})`);

    // P5.5: Health Check Loop (Wait for Server & UI)
    const checkServerHealth = (attempts = 0) => {
        const checks = [];

        // Check API (3001)
        checks.push(new Promise(resolve => {
            http.get(`http://localhost:${SERVER_PORT}/health`, res => resolve(res.statusCode === 200))
                .on('error', () => resolve(false));
        }));

        // Check UI (3000) for Dev
        if (!app.isPackaged) {
            checks.push(new Promise(resolve => {
                http.get('http://localhost:3000', res => resolve(res.statusCode === 200))
                    .on('error', () => resolve(false));
            }));
        }

        Promise.all(checks).then(results => {
            const allOk = results.every(r => r === true);
            if (allOk) {
                console.log('[Electron] All Services Ready. Loading UI...');
                mainWindow.loadURL(targetUrl);
                if (!app.isPackaged) {
                    mainWindow.webContents.openDevTools();
                }
            } else {
                if (attempts % 5 === 0) console.log(`[Electron] Waiting... (API: ${results[0]}, UI: ${results[1] !== undefined ? results[1] : 'N/A'})`);
                setTimeout(() => checkServerHealth(attempts + 1), 500);
            }
        });
    };

    checkServerHealth();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    const userDataPath = app.getPath('userData');
    const runsDir = path.join(userDataPath, 'MerFox', 'runs');

    console.log('=== Electron PoC Diagnostics ===');
    console.log(`userData Path: ${userDataPath}`);
    console.log(`MERFOX_RUNS_DIR: ${runsDir}`);
    console.log(`isPackaged: ${app.isPackaged}`);

    let serverScript;
    let distDir;
    let browsersPath; // P6.1: Browser Path

    if (app.isPackaged) {
        // P5.5: Packaged Path
        serverScript = path.join(process.resourcesPath, 'server/index.cjs');
        distDir = path.join(process.resourcesPath, 'dist');
        // P6.1: Localized Playwright Browsers
        browsersPath = path.join(process.resourcesPath, 'browsers');
    } else {
        serverScript = path.join(__dirname, '../server/index.js');
        distDir = path.join(__dirname, '../dist');
        // Dev: use local browsers folder or default
        browsersPath = path.join(__dirname, '../browsers');
    }

    console.log(`Server Script: ${serverScript}`);
    console.log(`Dist Dir: ${distDir}`);
    console.log(`Browsers Path: ${browsersPath}`);

    if (!fs.existsSync(serverScript)) {
        console.error(`[CRITICAL] Server script not found at: ${serverScript}`);
        return;
    }

    // P5.5: Spawn with Explicit Env & Config
    serverProcess = fork(serverScript, [], {
        env: {
            ...process.env,
            MERFOX_RUNS_DIR: runsDir,
            MERFOX_DIST_DIR: distDir,
            PLAYWRIGHT_BROWSERS_PATH: browsersPath, // P6.1: Force local browsers
            PORT: SERVER_PORT.toString(),
            NODE_ENV: app.isPackaged ? 'production' : 'development'
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    console.log(`Server Process Spawned. PID: ${serverProcess.pid}`);

    // Redirect Server Logs to Electron Console
    serverProcess.stdout.on('data', (data) => console.log(`[Server] ${data.toString().trim()}`));
    serverProcess.stderr.on('data', (data) => console.error(`[Server ERR] ${data.toString().trim()}`));

    serverProcess.on('error', (err) => {
        console.error('[Electron] Failed to start server child process:', err);
    });

    serverProcess.on('exit', (code, signal) => {
        console.log(`[Electron] Server process exited with code ${code} signal ${signal}`);
        serverProcess = null;
    });
    console.log('================================');
}

app.whenReady().then(() => {
    // P6: IPC Handler for Open Runs Dir
    ipcMain.handle('openRunsDir', async () => {
        const userDataPath = app.getPath('userData');
        const runsDir = path.join(userDataPath, 'MerFox', 'runs');
        console.log(`[IPC] Opening runs dir: ${runsDir}`);
        const result = await shell.openPath(runsDir);
        return result; // Empty string if success, error message if failed
    });

    startServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        console.log('Killing server process...');
        serverProcess.kill();
    }
});
