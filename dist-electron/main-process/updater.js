"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initUpdater = initUpdater;
const electron_updater_1 = require("electron-updater");
const electron_log_1 = __importDefault(require("electron-log"));
// import { dialog, BrowserWindow, shell } from 'electron';
// Configure logging
electron_log_1.default.transports.file.level = 'info';
electron_updater_1.autoUpdater.logger = electron_log_1.default;
function initUpdater() {
    // Auto-Update Disabled due to TLS/SSL blocking in user environment.
    // We strictly use manual updates via GitHub Releases.
    electron_log_1.default.info('Auto-update disabled. Use manual update: https://github.com/morgrisos/merfox/releases');
}
