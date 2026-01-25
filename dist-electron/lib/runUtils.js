"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRunsDir = getRunsDir;
exports.getGlobalMappingPath = getGlobalMappingPath;
exports.getRunDir = getRunDir;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
function getRunsDir() {
    if (process.env.MERFOX_RUNS_DIR)
        return process.env.MERFOX_RUNS_DIR;
    if (process.env.MERFOX_USER_DATA)
        return path_1.default.join(process.env.MERFOX_USER_DATA, 'MerFox/runs');
    if (process.env.NODE_ENV === 'development')
        return path_1.default.join(process.cwd(), 'runs_dev');
    return path_1.default.join(os_1.default.homedir(), 'Library/Application Support/merfox/MerFox/runs');
}
function getGlobalMappingPath() {
    const runsDir = getRunsDir();
    return path_1.default.join(path_1.default.dirname(runsDir), 'mapping.csv'); // .../MerFox/mapping.csv
}
async function getRunDir(runId) {
    const runsDir = getRunsDir();
    const directPath = path_1.default.join(runsDir, runId);
    try {
        await promises_1.default.access(directPath);
    }
    catch {
        return null;
    }
    // 1. Search for subfolder <YYYY-MM-DD_runNNN>
    try {
        const entries = await promises_1.default.readdir(directPath, { withFileTypes: true });
        const subdirs = entries
            .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_run\d{3}$/.test(e.name))
            .map(e => e.name)
            .sort().reverse();
        if (subdirs.length > 0) {
            return path_1.default.join(directPath, subdirs[0]);
        }
    }
    catch (e) {
        console.error('Run sub-search failed:', e);
    }
    // 2. Fallback: Check if direct path has raw.csv (Legacy flat)
    try {
        await promises_1.default.access(path_1.default.join(directPath, 'raw.csv'));
        return directPath;
    }
    catch { }
    return null;
}
