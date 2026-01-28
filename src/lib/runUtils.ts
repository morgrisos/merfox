import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export function getRunsDir() {
    if (process.env.MERFOX_RUNS_DIR) return process.env.MERFOX_RUNS_DIR;
    if (process.env.MERFOX_USER_DATA) return path.join(process.env.MERFOX_USER_DATA, 'MerFox/runs');
    if (process.env.NODE_ENV === 'development') return path.join(process.cwd(), 'runs_dev');
    return path.join(os.homedir(), 'Library/Application Support/merfox/MerFox/runs');
}

export function getConfigPath() {
    // Config should be adjacent to runs, e.g. .../MerFox/merfox.automation.json
    const runsDir = getRunsDir();
    return path.join(path.dirname(runsDir), 'merfox.automation.json');
}

export function getGlobalMappingPath() {
    const runsDir = getRunsDir();
    return path.join(path.dirname(runsDir), 'mapping.csv'); // .../MerFox/mapping.csv
}

export async function getRunDir(runId: string): Promise<string | null> {
    const runsDir = getRunsDir();
    const directPath = path.join(runsDir, runId);

    try {
        await fs.access(directPath);
    } catch {
        return null;
    }

    // 1. Search for subfolder <YYYY-MM-DD_runNNN>
    try {
        const entries = await fs.readdir(directPath, { withFileTypes: true });
        const subdirs = entries
            .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_run\d{3}$/.test(e.name))
            .map(e => e.name)
            .sort().reverse();

        if (subdirs.length > 0) {
            return path.join(directPath, subdirs[0]);
        }
    } catch (e) {
        console.error('Run sub-search failed:', e);
    }

    // 2. Fallback: Check if direct path has raw.csv (Legacy flat)
    try {
        await fs.access(path.join(directPath, 'raw.csv'));
        return directPath;
    } catch { }

    return null;
}
