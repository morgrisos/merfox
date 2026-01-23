import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
// csv-parse might need install if missing in V4, assuming present
import { parse } from 'csv-parse/sync';
import { getRunsDir } from '../../../lib/runUtils';

function findColumnValue(record: any, candidates: string[]): string | undefined {
    const keys = Object.keys(record);
    for (const candidate of candidates) {
        if (record[candidate] !== undefined) return record[candidate];
        const foundKey = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
        if (foundKey) return record[foundKey];
    }
    return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const runsDir = getRunsDir();
        try {
            await fs.access(runsDir);
        } catch {
            return res.json({
                data: [],
                meta: { scanPath: runsDir, error: 'Directory not found' }
            });
        }

        const entries = await fs.readdir(runsDir, { withFileTypes: true });
        // Sort by mtime
        const dirStats = await Promise.all(
            entries.filter(e => e.isDirectory()).map(async e => {
                try {
                    const stats = await fs.stat(path.join(runsDir, e.name));
                    return { name: e.name, mtime: stats.mtime.getTime() };
                } catch { return { name: e.name, mtime: 0 }; }
            })
        );
        const runDirs = dirStats.sort((a, b) => b.mtime - a.mtime).map(e => e.name);

        const runs = [];

        // Limit scanning if requested (simple impl)
        // const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

        for (const dirName of runDirs) {
            const runIdPath = path.join(runsDir, dirName);

            // Artifact Source Resolution
            let artifactPath = runIdPath;
            try {
                const subEntries = await fs.readdir(runIdPath, { withFileTypes: true });
                const subdirs = subEntries
                    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}_run\d{3}$/.test(e.name))
                    .map(e => e.name)
                    .sort().reverse();

                if (subdirs.length > 0) {
                    artifactPath = path.join(runIdPath, subdirs[0]);
                }
            } catch { }

            let runFiles: string[] = [];
            try { runFiles = await fs.readdir(artifactPath); } catch { }

            const stats = { totalScanned: 0, success: 0, failed: 0 };
            const failureReasonMap = new Map<string, number>();
            const failedUrls: any[] = [];

            // Quick scan for failed CSVs
            const failedCsvs = runFiles.filter(f => f.endsWith('_failed.csv'));
            for (const csvFile of failedCsvs) {
                try {
                    const content = await fs.readFile(path.join(artifactPath, csvFile), 'utf8');
                    const bomSafe = content.startsWith('\uFEFF') ? content.slice(1) : content;
                    const records = parse(bomSafe, { columns: true, skip_empty_lines: true, relax_column_count: true });

                    stats.failed += records.length;

                    // Only process deep failure logic for top 50 or if asked... skipping deep parse for listing speed optimization if needed
                    // For now, keep it simple/robust
                    for (const record of records) {
                        const reason = findColumnValue(record, ['reason_detail', 'reason', 'error', 'message', 'detail']) || 'Unknown';
                        failureReasonMap.set(reason, (failureReasonMap.get(reason) || 0) + 1);

                        if (failedUrls.length < 5) { // Limit valid items
                            const url = findColumnValue(record, ['item_url', 'url', 'link']);
                            const title = findColumnValue(record, ['title', 'item_title', 'name']);
                            if (url) failedUrls.push({ url, reason, title: title || 'No Title' });
                        }
                    }
                } catch { }
            }

            if (runFiles.includes('amazon.tsv')) {
                try {
                    const content = await fs.readFile(path.join(artifactPath, 'amazon.tsv'), 'utf8');
                    stats.success = Math.max(0, content.trim().split('\n').length - 1);
                } catch { }
            } else if (runFiles.includes('raw.csv')) {
                try {
                    const content = await fs.readFile(path.join(artifactPath, 'raw.csv'), 'utf8');
                    stats.success = Math.max(0, content.trim().split('\n').length - 1);
                } catch { }
            }

            stats.totalScanned = stats.success + stats.failed;

            const sortedReasons = Array.from(failureReasonMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => ({ reason, count }));

            let date = '';
            const dateMatch = dirName.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) date = dateMatch[1];
            if (!date) {
                try {
                    const stat = await fs.stat(runIdPath);
                    date = stat.birthtime.toISOString().split('T')[0];
                } catch { date = 'Unknown' }
            }

            // Status Logic
            let status = 'unknown';
            if (runFiles.includes('amazon.tsv') || runFiles.includes('amazon_upload.tsv')) {
                status = 'completed';
            } else if (stats.failed > 0) {
                status = 'failed';
            } else {
                status = 'completed'; // Default for old runs if they exist
            }

            runs.push({
                id: dirName,
                name: dirName,
                platform: 'Mercari', // Default
                target: dirName, // Default to ID as we lack metadata
                status,
                date,
                path: runIdPath,
                stats,
                failureReasons: sortedReasons,
                failedUrls,
                artifacts: {
                    hasGoogle: false,
                    hasAmazon: runFiles.includes('amazon.tsv'),
                    hasProfit: runFiles.includes('profit.tsv'),
                    hasAsin: runFiles.includes('asin.tsv'),
                    hasRaw: runFiles.includes('raw.csv'),
                    hasMapping: runFiles.includes('mapping.csv'),
                    mapping: await (async () => {
                        if (!runFiles.includes('mapping.csv')) return { status: 'none' };
                        try {
                            const content = await fs.readFile(path.join(artifactPath, 'mapping.csv'), 'utf8');
                            // BOM check not strictly needed for line counting if just roughly 1-2 lines, but good practice
                            const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
                            return {
                                status: lines.length > 1 ? 'custom' : 'standard',
                                rows: lines.length
                            };
                        } catch {
                            return { status: 'none' };
                        }
                    })()
                }
            });
        }

        runs.sort((a, b) => b.name.localeCompare(a.name));

        res.status(200).json({
            data: runs,
            meta: { scanPath: runsDir }
        });

    } catch (e: any) {
        console.error('[API] Error fetching runs:', e);
        res.status(500).json({ error: 'Failed to fetch runs', details: e.message });
    }
}
