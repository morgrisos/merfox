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

        // [FIX] Priority: progress.json > summary.json > raw.csv fallback
        let progress: any = null;
        try {
            const pPath = path.join(runPath, 'progress.json');
            const pData = await fs.readFile(pPath, 'utf8');
            progress = JSON.parse(pData);
        } catch { }

        // 1. Files Check
        const files = {
            raw: false,
            mapping: false,
            amazon: false,
            failed: 0,
            logFile: ''
        };
        try {
            const runDirEntries = await fs.readdir(runPath);
            if (runDirEntries.includes('raw.csv')) files.raw = true;
            if (runDirEntries.includes('mapping.csv')) files.mapping = true;
            if (runDirEntries.includes('amazon_upload.tsv')) files.amazon = true; // Fixed name
            const failedCsvs = runDirEntries.filter(f => f.endsWith('_failed.csv'));
            files.failed = failedCsvs.length;
        } catch { }

        // 2. Construct Response from Progress
        let status = 'running';
        let phase = 'init';
        let counts = { scanned: 0, success: 0, failed: 0 };
        let message = '';
        let updatedAt = new Date().toISOString();

        if (progress) {
            // [Source: progress.json]
            phase = progress.phase || 'running';
            status = (phase === 'done' || phase === 'error' || phase === 'stopped') ? 'completed' : 'running';
            if (phase === 'stopped') status = 'stopped'; // Optional granular status

            counts = progress.counts || { scanned: 0, success: 0, failed: 0 };
            message = progress.message || '';
            updatedAt = progress.updatedAt || updatedAt;
        } else {
            // [Source: Legacy Fallback]
            let fallbackCount = 0;
            if (files.raw) {
                try {
                    const rawPath = path.join(runPath, 'raw.csv');
                    const rawContent = await fs.readFile(rawPath, 'utf8');
                    const lines = rawContent.trim().split('\n');
                    fallbackCount = lines.length > 0 ? lines.length - 1 : 0;
                } catch { }
            }

            counts.scanned = fallbackCount;
            counts.success = fallbackCount;

            // Guess Status from Time
            let isRunning = true;
            if (files.raw) {
                try {
                    const stats = await fs.stat(path.join(runPath, 'raw.csv'));
                    const ageMs = Date.now() - stats.mtime.getTime();
                    if (ageMs > 15000) isRunning = false;
                } catch { }
            }
            status = isRunning ? 'running' : 'completed';
            phase = isRunning ? 'detail_fetch' : 'done';
            message = isRunning ? '処理中 (Legacy)' : '完了 (Legacy)';
        }

        // [Log] Disabled to prevent freeze
        const log = {
            file: '',
            tail: [`[System] Phase: ${phase}`, `[System] Message: ${message}`, `[System] Updated: ${updatedAt}`]
        };

        return res.status(200).json({
            latestRunId,
            status,
            phase,
            counts,
            updatedAt,
            message,
            files,
            log
        });

    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
