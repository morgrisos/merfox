import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { getRunsDir } from '../../../lib/runUtils';

// Helper to count lines in CSV/TSV, excluding header
// Returns 0 if empty or just header
function countLinesOneIndexed(content: string): number {
    const lines = content.trim().split('\n').filter(line => line.trim().length > 0);
    return Math.max(0, lines.length - 1);
}

// Helper: Calculate mapping pending count from mapping.csv content
// Assumes header exists. Checks for empty values in typical required columns.
function countMappingPending(content: string): number {
    const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return 0;

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    // Find generic target columns
    const asinIdx = header.findIndex(h => h.includes('asin') || h.includes('amazon_id'));

    let pending = 0;
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');

        if (asinIdx >= 0) {
            if (!row[asinIdx] || row[asinIdx].trim() === '') {
                pending++;
            }
        } else {
            // If column not found, fallback to counting all rows
            pending++;
        }
    }
    return pending;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const debugSources: Record<string, string> = {
        newCandidates: 'none',
        uploadReady: 'none',
        mappingPending: 'none',
        warnings: 'none'
    };

    try {
        const runsDir = getRunsDir();

        // 1. Find Latest Run by mtime
        let latestRunDir = '';
        let latestRunId = '';

        try {
            const entries = await fs.readdir(runsDir, { withFileTypes: true });
            const dirs = entries.filter(e => e.isDirectory());

            if (dirs.length > 0) {
                const statsPromises = dirs.map(async (d) => {
                    const fullPath = path.join(runsDir, d.name);
                    try {
                        const stat = await fs.stat(fullPath);
                        return { name: d.name, path: fullPath, mtimeMs: stat.mtimeMs };
                    } catch {
                        return { name: d.name, path: fullPath, mtimeMs: 0 };
                    }
                });

                const stats = await Promise.all(statsPromises);
                stats.sort((a, b) => b.mtimeMs - a.mtimeMs); // Descending

                if (stats.length > 0) {
                    latestRunDir = stats[0].path;
                    latestRunId = stats[0].name;
                }
            }
        } catch (e) {
            // Directory might not exist or empty
        }

        if (!latestRunDir) {
            return res.status(200).json({
                latestRunId: null,
                newCandidates: 0,
                uploadReady: 0,
                mappingPending: 0,
                warnings: 0,
                sources: debugSources
            });
        }

        // 2. Define Metrics
        let newCandidates = 0;
        let uploadReady = 0;
        let mappingPending = 0;
        let warnings = 0;

        // Helpers
        const checkFile = async (candidates: string[]): Promise<{ path: string, content: string } | null> => {
            for (const c of candidates) {
                const p = path.join(latestRunDir, c);
                try {
                    const content = await fs.readFile(p, 'utf8');
                    return { path: c, content };
                } catch {
                    // continue
                }
            }
            return null;
        };

        const tryReadJson = async (p: string) => {
            try {
                const content = await fs.readFile(path.join(latestRunDir, p), 'utf8');
                return JSON.parse(content);
            } catch { return null; }
        }

        // --- Metric: New Candidates ---
        // Priority: summary.json (export_rows) -> raw.csv
        const summaryJson = await tryReadJson('summary.json');

        if (summaryJson && typeof summaryJson.export_rows === 'number') {
            newCandidates = summaryJson.export_rows;
            debugSources.newCandidates = 'summary.json:export_rows';
        } else {
            const rawFile = await checkFile(['raw.csv', 'raw/raw.csv']);
            if (rawFile) {
                newCandidates = countLinesOneIndexed(rawFile.content);
                debugSources.newCandidates = rawFile.path;
            }
        }

        // --- Metric: Upload Ready ---
        // amazon/amazon.tsv -> amazon.tsv -> csv variants
        const amazonFile = await checkFile(['amazon/amazon.tsv', 'amazon.tsv', 'amazon/amazon.csv', 'amazon.csv']);
        if (amazonFile) {
            uploadReady = countLinesOneIndexed(amazonFile.content);
            debugSources.uploadReady = amazonFile.path;
        }

        // --- Metric: Warnings ---
        // summary.json (failed_rows) -> failed files
        if (summaryJson && typeof summaryJson.failed_rows === 'number') {
            warnings = summaryJson.failed_rows;
            debugSources.warnings = 'summary.json:failed_rows';
        } else {
            const failedCandidates = ['failed/failed.csv', 'failed.csv', 'failed/mapping_failed.csv', 'failed/_failed.csv', '_failed.csv'];
            const failedFile = await checkFile(failedCandidates);
            if (failedFile) {
                warnings = countLinesOneIndexed(failedFile.content);
                debugSources.warnings = failedFile.path;
            }
        }

        // --- Metric: Mapping Pending ---
        // mapping.csv -> failed (fallback logic per instructions)
        const mappingFile = await checkFile(['mapping.csv', 'mapping/mapping.csv']);
        if (mappingFile) {
            mappingPending = countMappingPending(mappingFile.content);
            debugSources.mappingPending = mappingFile.path;
        } else {
            const mappingFailedFile = await checkFile(['failed/mapping_failed.csv', 'mapping_failed.csv']);
            if (mappingFailedFile) {
                mappingPending = countLinesOneIndexed(mappingFailedFile.content);
                debugSources.mappingPending = mappingFailedFile.path;
            } else {
                mappingPending = 0;
            }
        }

        // Final Safety: Non-negative integers
        newCandidates = Math.max(0, Math.round(newCandidates));
        uploadReady = Math.max(0, Math.round(uploadReady));
        mappingPending = Math.max(0, Math.round(mappingPending));
        warnings = Math.max(0, Math.round(warnings));

        // --- Phase 2-2: Extended Data ---

        // 1. Latest Run Info
        const latestRun = {
            runId: latestRunId,
            startedAt: summaryJson?.started_at || 'Recently',
            status: summaryJson?.status || 'unknown',
            exportRows: newCandidates,
            failedRows: warnings
        };

        // 2. Top 10 (from raw.csv)
        const top10: any[] = [];
        const rawFile = await checkFile(['raw.csv', 'raw/raw.csv']);
        if (rawFile) {
            const lines = rawFile.content.trim().split('\n').filter(l => l.trim().length > 0);
            if (lines.length > 1) { // Has header + data
                const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
                const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
                const priceIdx = header.findIndex(h => h.includes('price'));
                const urlIdx = header.findIndex(h => h.includes('url')); // url or item_url

                // Take first 10 data rows
                const dataLines = lines.slice(1, 11);
                dataLines.forEach((line, idx) => {
                    const cols = line.split(','); // Simple split, might break on quoted commas but OK for this phase constraint
                    // Helper to safely get col
                    const getCol = (i: number) => (i >= 0 && i < cols.length) ? cols[i].replace(/"/g, '').trim() : '';

                    top10.push({
                        rank: idx + 1,
                        title: getCol(titleIdx) || 'No Title',
                        price: getCol(priceIdx) || '---',
                        url: getCol(urlIdx) || '',
                        reason: '最新Runから抽出'
                    });
                });
            }
        }

        // 3. Dangers (from failed files)
        const dangers: any[] = [];
        const failedCandidates = ['failed/failed.csv', 'failed.csv', 'failed/mapping_failed.csv', 'failed/_failed.csv', '_failed.csv'];
        const failedFile = await checkFile(failedCandidates);
        if (failedFile) {
            const lines = failedFile.content.trim().split('\n').filter(l => l.trim().length > 0);
            // Assuming no header or header is "error,url" etc. simpler to just take top lines
            // If header exists, skip it? usually failed csvs have headers.
            // Let's assume header exists if > 1 line and first line looks like header.
            // For safety, just take lines 1-10 (skipping line 0 as potential header)
            const startIdx = lines.length > 1 && (lines[0].includes('error') || lines[0].includes('reason')) ? 1 : 0;
            const dangerLines = lines.slice(startIdx, startIdx + 10);

            dangerLines.forEach(line => {
                dangers.push({
                    level: 'warn',
                    message: line.substring(0, 100) // Truncate
                });
            });
        }

        // 4. CTA Logic
        // Priority: warnings > mapping > upload > new > default
        let cta = { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' }; // Default

        if (warnings > 0) {
            cta = { kind: 'runs', label: 'エラーを確認', href: '/runs' };
        } else if (mappingPending > 0) {
            cta = { kind: 'mapping', label: 'マッピングを行う', href: '/mapping' }; // Using mapping stub or wizard/step4
        } else if (uploadReady > 0) {
            cta = { kind: 'upload', label: '最終TSVを確認', href: '/runs' }; // Direct to runs to see artifacts
        } else if (newCandidates > 0) {
            cta = { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' };
        }

        res.status(200).json({
            latestRunId,
            newCandidates,
            uploadReady,
            mappingPending,
            warnings,
            sources: debugSources,
            // Extended Data
            latestRun,
            top10,
            dangers,
            cta
        });

    } catch (e: any) {
        console.error('Dashboard Summary API Error:', e);
        // Fallback 0 for everything
        res.status(200).json({
            latestRunId: null,
            newCandidates: 0,
            uploadReady: 0,
            mappingPending: 0,
            warnings: 0,
            sources: debugSources
        });
    }
}
