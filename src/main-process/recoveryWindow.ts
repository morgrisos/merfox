import { BrowserWindow, ipcMain, app } from 'electron';
import * as logger from './logger';

interface RecoveryOptions {
    reason: string;
    port: number;
    logPath: string;
    errorCode?: string;
}

let recoveryWindow: BrowserWindow | null = null;

export function showRecoveryWindow(options: RecoveryOptions) {
    logger.error(`Showing recovery window: ${options.reason}`);

    if (recoveryWindow) {
        recoveryWindow.focus();
        return;
    }

    const errorMessage = options.errorCode === 'EADDRINUSE'
        ? `他のアプリが ${options.port} 番ポートを使用中です。\n\n【解決方法】\n1. 該当アプリを終了してから再試行\n2. MERFOX_PORT環境変数でポート変更（例: MERFOX_PORT=13338）\n3. PC再起動で解決する場合があります`
        : options.reason;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MerFox - バックエンド起動失敗</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #ff6b6b;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .message {
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 24px;
            color: rgba(255, 255, 255, 0.8);
            white-space: pre-wrap;
        }
        .details {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 24px;
            font-size: 12px;
            font-family: 'Monaco', 'Courier New', monospace;
            color: rgba(255, 255, 255, 0.6);
        }
        .buttons {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        button {
            flex: 1;
            min-width: 120px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary {
            background: #4CAF50;
            color: white;
        }
        .btn-primary:hover {
            background: #45a049;
            transform: translateY(-1px);
        }
        .btn-secondary {
            background: #2196F3;
            color: white;
        }
        .btn-secondary:hover {
            background: #0b7dda;
            transform: translateY(-1px);
        }
        .btn-tertiary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .btn-tertiary:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
        }
        button:active {
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">⚠️</div>
        <h1>バックエンドの起動に失敗しました</h1>
        <div class="message">${errorMessage}</div>
        <div class="details">
ポート: ${options.port}
ログ: ${options.logPath}
        </div>
        <div class="buttons">
            <button class="btn-primary" onclick="retry()">再試行</button>
            <button class="btn-secondary" onclick="restart()">アプリ再起動</button>
            <button class="btn-tertiary" onclick="openLogs()">ログを開く</button>
        </div>
    </div>
    <script>
        const { ipcRenderer } = require('electron');
        
        function retry() {
            ipcRenderer.send('recovery:retry');
        }
        
        function restart() {
            ipcRenderer.send('recovery:restart');
        }
        
        function openLogs() {
            ipcRenderer.send('recovery:open-logs');
        }
    </script>
</body>
</html>
    `;

    recoveryWindow = new BrowserWindow({
        width: 600,
        height: 500,
        resizable: false,
        minimizable: false,
        maximizable: false,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    recoveryWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    recoveryWindow.on('closed', () => {
        recoveryWindow = null;
    });
}

export function setupRecoveryHandlers(retryCallback: () => void) {
    ipcMain.on('recovery:retry', () => {
        logger.info('User requested retry from recovery window');
        if (recoveryWindow) {
            recoveryWindow.close();
        }
        retryCallback();
    });

    ipcMain.on('recovery:restart', () => {
        logger.info('User requested app restart from recovery window');
        app.relaunch();
        app.exit(0);
    });

    ipcMain.on('recovery:open-logs', () => {
        logger.info('User requested to open logs from recovery window');
        const { shell } = require('electron');
        shell.openPath(logger.getLogDir());
    });
}
