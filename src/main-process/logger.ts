import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let logPath: string;
let logDir: string;

/**
 * Initialize logger - creates log directory if needed
 */
export function initLogger() {
    try {
        logDir = process.platform === 'darwin'
            ? path.join(app.getPath('home'), 'Library/Application Support/MerFox/logs')
            : path.join(app.getPath('userData'), 'logs');

        // Create directory if it doesn't exist
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        logPath = path.join(logDir, 'main.log');

        // Write startup header
        const pkg = require('../../package.json');
        log('='.repeat(80));
        log(`MerFox v${pkg.version} - Main Process Started`);
        log(`PID: ${process.pid}`);
        log(`Platform: ${process.platform}`);
        log(`Time: ${new Date().toISOString()}`);
        log('='.repeat(80));
    } catch (e) {
        console.error('Failed to initialize logger:', e);
    }
}

/**
 * Write log entry to main.log
 */
function writeLog(level: string, message: string) {
    if (!logPath) return;

    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (e) {
        // Silently fail to avoid infinite loops
    }
}

export function log(message: string) {
    console.log(message);
    writeLog('INFO', message);
}

export function info(message: string) {
    console.log(`[INFO] ${message}`);
    writeLog('INFO', message);
}

export function warn(message: string) {
    console.warn(`[WARN] ${message}`);
    writeLog('WARN', message);
}

export function error(message: string, err?: Error) {
    console.error(`[ERROR] ${message}`, err || '');
    writeLog('ERROR', message);
    if (err && err.stack) {
        writeLog('ERROR', err.stack);
    }
}

export function getLogPath(): string {
    return logPath;
}

export function getLogDir(): string {
    return logDir;
}
