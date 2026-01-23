import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { getRunsDir } from '../../../lib/runUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const runsDir = getRunsDir();
        let runDirs: string[] = [];
        try {
            const entries = await fs.readdir(runsDir, { withFileTypes: true });

            // Get stats for sorting by Modification Time (Desc)
            const dirStats = await Promise.all(
                entries
                    .filter(e => e.isDirectory())
                    .map(async e => {
                        const fullPath = path.join(runsDir, e.name);
                        try {
                            const stats = await fs.stat(fullPath);
                            return { name: e.name, mtime: stats.mtime.getTime() };
                        } catch {
                            return { name: e.name, mtime: 0 };
                        }
                    })
            );

            runDirs = dirStats
                .sort((a, b) => b.mtime - a.mtime) // Newest first
                .map(d => d.name);

        } catch {
            return res.status(200).json({ latestRunId: null, status: 'none' });
        }

        if (runDirs.length === 0) {
            return res.status(200).json({ latestRunId: null, status: 'none' });
        }

        const latestRunId = runDirs[0];
        const runPath = path.join(runsDir, latestRunId);

        // 1. Read key files existence
        const files = {
            raw: false,
            mapping: false,
            amazon: false,
            failed: 0,
            logFile: ''
        };

        let runDirEntries: string[] = [];
        try {
            runDirEntries = await fs.readdir(runPath);
        } catch {
            return res.status(200).json({ latestRunId, status: 'unknown' });
        }

        if (runDirEntries.includes('raw.csv')) files.raw = true;
        if (runDirEntries.includes('mapping.csv')) files.mapping = true;
        if (runDirEntries.includes('amazon.tsv')) files.amazon = true;

        const failedCsvs = runDirEntries.filter(f => f.endsWith('_failed.csv'));
        files.failed = failedCsvs.length;

        // 2. Read Summary
        let summary: any = {};
        if (runDirEntries.includes('summary.json')) {
            try {
                const data = await fs.readFile(path.join(runPath, 'summary.json'), 'utf8');
                summary = JSON.parse(data);
            } catch { }
        }

        const status = summary.status || 'unknown';

        // 3. Read Log (Tail)
        let logContent: string[] = [];
        const logCandidates = ['run.log', 'scraper.log', 'server.log'];
        for (const candidate of logCandidates) {
            if (runDirEntries.includes(candidate)) {
                files.logFile = candidate;
                break;
            }
        }
        // Fallback: any .log file
        if (!files.logFile) {
            const anyLog = runDirEntries.find(f => f.endsWith('.log'));
            if (anyLog) files.logFile = anyLog;
        }

        if (files.logFile) {
            try {
                const logFullPath = path.join(runPath, files.logFile);
                const stats = await fs.stat(logFullPath);
                const size = stats.size;
                const bufferSize = Math.min(size, 50 * 1024); // Read last 50KB

                const handle = await fs.open(logFullPath, 'r');
                const buffer = Buffer.alloc(bufferSize);
                await handle.read(buffer, 0, bufferSize, size - bufferSize);
                await handle.close();

                const text = buffer.toString('utf8');
                // Split lines, handle partial line at start
                let lines = text.split('\n');
                if (size > bufferSize) lines.shift(); // remove partial first line

                // Get last 200 lines
                if (lines.length > 200) lines = lines.slice(-200);
                logContent = lines;
            } catch (e) {
                logContent = [`[Error reading log: ${String(e)}]`];
            }
        }

        return res.status(200).json({
            latestRunId,
            status,
            summary,
            files,
            log: { file: files.logFile, tail: logContent }
        });

    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
