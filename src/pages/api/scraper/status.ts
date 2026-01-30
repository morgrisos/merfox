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

        // [FIX] Fallback: Count raw.csv lines if summary is missing/stale
        let fallbackCount = 0;
        if (files.raw) {
            try {
                const rawPath = path.join(runPath, 'raw.csv');
                const rawContent = await fs.readFile(rawPath, 'utf8');
                // Simple line count (minus header)
                const lines = rawContent.trim().split('\n');
                fallbackCount = lines.length > 0 ? lines.length - 1 : 0;

                if (!summary.stats) summary.stats = {};
                summary.stats.scanned = fallbackCount;
                summary.itemsCount = fallbackCount;
                summary.stats.newItems = fallbackCount;
                console.log(`[StatusAPI] Fallback Count Success: ${fallbackCount}. Path: ${rawPath}`);
            } catch (e) {
                console.error('[StatusAPI] Fallback Count Failed', e);
            }
        } else {
            console.log(`[StatusAPI] No raw.csv found in ${runPath}. Entries: ${runDirEntries.join(',')}`);
        }

        // [FIX: Lightweight Status Inference]
        // Avoid reading run.log entirely to prevent API hangs during write contention.
        // Use raw.csv mtime to guess 'running' vs 'completed'.

        if (!summary.status || summary.status === 'unknown') {
            let isRunning = true;

            if (files.raw && fallbackCount > 0) {
                try {
                    const rawPath = path.join(runPath, 'raw.csv');
                    const stats = await fs.stat(rawPath);
                    const now = Date.now();
                    const ageMs = now - stats.mtime.getTime();

                    // If raw.csv hasn't been touched in 15 seconds, assume finished.
                    if (ageMs > 15000) {
                        isRunning = false;
                    }
                } catch { }

                summary.status = isRunning ? 'running' : 'completed';
            } else {
                // No raw file yet, must be starting
                summary.status = 'running';
            }
        }

        const status = summary.status || 'running';

        // 3. Log Reading Disabled (Prevent Freeze)
        // We do NOT read run.log here anymore.
        let logContent: string[] = ["[System] Log tail disabled to prevent API freeze/deadlock during scraping."];

        return res.status(200).json({
            latestRunId,
            status,
            summary,
            files,
            counts: {
                scanned: summary.stats?.scanned || fallbackCount || 0,
                success: summary.stats?.newItems || fallbackCount || 0
            },
            log: { file: files.logFile, tail: logContent }
        });

    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
