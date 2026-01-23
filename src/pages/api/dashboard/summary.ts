import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { getRunsDir } from '../../../lib/runUtils';

// Helper: Normalize string for header comparison
function normalizeHeader(h: string): string {
    return h.trim().toLowerCase().replace(/['"_\s]/g, '');
}

// Helper: Robust line counting (BOM, CRLF, Header, Empty)
function countDataLines(content: string): number {
    // Remove BOM
    const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    return Math.max(0, lines.length - 1); // Exclude header
}

// Helper: Split line by comma or tab (simple detection)
function splitLine(line: string): string[] {
    if (line.includes('\t')) return line.split('\t');
    // Handle quoted fields simply for this phase (robust CSV parser not required yet)
    // Just simple split to satisfy "split by comma" requirement
    return line.split(',');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const debugSources: Record<string, string> = {
        newCandidates: 'none',
        uploadReady: 'none',
        mappingPending: 'none',
        warnings: 'none',
        dangers: 'none'
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
                sources: debugSources,
                top10: [],
                dangers: [],
                cta: { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' }
            });
        }

        // --- Helpers ---
        const readFileSafe = async (filename: string): Promise<{ content: string, path: string } | null> => {
            try {
                const p = path.join(latestRunDir, filename);
                const content = await fs.readFile(p, 'utf8');
                return { content, path: filename };
            } catch { return null; }
        };

        const tryReadJson = async (p: string) => {
            try {
                const content = await fs.readFile(path.join(latestRunDir, p), 'utf8');
                return JSON.parse(content);
            } catch { return null; }
        }

        // --- Metrics ---
        let newCandidates = 0;
        let uploadReady = 0;
        let mappingPending = 0;
        let warnings = 0;
        let top10: any[] = [];
        let dangers: any[] = [];

        // 1. New Candidates (from summary.json or raw.csv)
        // Also extract Top 10 here to save read
        const summaryJson = await tryReadJson('summary.json');

        // Always try to read raw.csv for Top 10 even if summary.json exists
        const rawFile = await readFileSafe('raw.csv') || await readFileSafe('raw/raw.csv');

        if (summaryJson && typeof summaryJson.export_rows === 'number') {
            newCandidates = summaryJson.export_rows;
            debugSources.newCandidates = 'summary.json:export_rows';
        } else if (rawFile) {
            newCandidates = countDataLines(rawFile.content);
            debugSources.newCandidates = rawFile.path;
        }

        if (rawFile) {
            const cleanContent = rawFile.content.charCodeAt(0) === 0xFEFF ? rawFile.content.slice(1) : rawFile.content;
            const lines = cleanContent.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length > 1) {
                const header = splitLine(lines[0]).map(h => normalizeHeader(h));
                const titleIdx = header.findIndex(h => h.includes('title') || h.includes('name'));
                const priceIdx = header.findIndex(h => h.includes('price'));
                const urlIdx = header.findIndex(h => h.includes('url')); // url or itemurl

                lines.slice(1, 11).forEach((line, idx) => {
                    const cols = splitLine(line);
                    const getCol = (i: number) => (i >= 0 && i < cols.length) ? cols[i].replace(/^"|"$/g, '').trim() : '';

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

        // 2. Upload Ready
        const amazonTsv = await readFileSafe('amazon.tsv') || await readFileSafe('amazon/amazon.tsv');
        if (amazonTsv) {
            uploadReady = countDataLines(amazonTsv.content);
            debugSources.uploadReady = amazonTsv.path;
        } else {
            const amazonCsv = await readFileSafe('amazon.csv') || await readFileSafe('amazon/amazon.csv');
            if (amazonCsv) {
                uploadReady = countDataLines(amazonCsv.content);
                debugSources.uploadReady = amazonCsv.path;
            }
        }

        // 3. Mapping Pending & 4. Warnings & 5. Dangers
        // Gather failed files first
        const failedFiles: { content: string, path: string }[] = [];
        try {
            const files = await fs.readdir(latestRunDir);
            for (const f of files) {
                // Broad match for failed files: *failed*.csv OR *failed*.tsv (excluding mapping.csv if it matches "failed" logic which it shouldn't, but explicitly checking)
                // Also explicitly check common names
                const lower = f.toLowerCase();
                if ((lower.includes('failed') || lower.includes('failures')) && (lower.endsWith('.csv') || lower.endsWith('.tsv'))) {
                    const data = await readFileSafe(f);
                    if (data) failedFiles.push(data);
                }
            }
        } catch { }

        // Mapping Logic
        const mappingCsv = await readFileSafe('mapping.csv') || await readFileSafe('mapping/mapping.csv');
        if (mappingCsv) {
            const cleanContent = mappingCsv.content.charCodeAt(0) === 0xFEFF ? mappingCsv.content.slice(1) : mappingCsv.content;
            const lines = cleanContent.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length > 1) {
                const headerRaw = lines[0];
                const header = splitLine(headerRaw).map(h => normalizeHeader(h));
                const candidates = ['asin', 'amazonasin', 'amazonasincode', 'amazonid', 'asincode', 'amazonproductid', 'amazon_product_id'];
                const asinIdx = header.findIndex(h => candidates.some(c => h === c || h.includes(c)));

                if (asinIdx !== -1) {
                    let pendingCount = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const cols = splitLine(lines[i]);
                        if (cols.length <= asinIdx || !cols[asinIdx] || cols[asinIdx].trim() === '') {
                            pendingCount++;
                        }
                    }
                    mappingPending = pendingCount;
                    debugSources.mappingPending = `mapping.csv:${candidates.find(c => header[asinIdx].includes(c)) || 'col'}`;
                } else {
                    debugSources.mappingPending = `mapping.csv:no_asin_col`;
                }
            }
        } else {
            // Fallback: Scan failed files for keywords
            let pendingCount = 0;
            for (const f of failedFiles) {
                const cleanContent = f.content.charCodeAt(0) === 0xFEFF ? f.content.slice(1) : f.content;
                const lines = cleanContent.split(/\r?\n/).filter(l => l.trim().length > 0);
                // Exclude header
                if (lines.length > 1) {
                    for (let i = 1; i < lines.length; i++) {
                        const lineLower = lines[i].toLowerCase();
                        if (lineLower.includes('mapping') || lineLower.includes('asin') || lineLower.includes('未設定')) {
                            pendingCount++;
                        }
                    }
                }
            }
            if (pendingCount > 0) {
                mappingPending = pendingCount;
                debugSources.mappingPending = 'failed_scan';
            }
        }

        // Warnings & Dangers Logic
        if (summaryJson && typeof summaryJson.failed_rows === 'number') {
            warnings = summaryJson.failed_rows;
            debugSources.warnings = 'summary.json:failed_rows';
        } else {
            // Sum of all failed files lines
            let totalFailed = 0;
            for (const f of failedFiles) {
                totalFailed += countDataLines(f.content);
            }
            warnings = totalFailed;
            if (failedFiles.length > 0) debugSources.warnings = 'failed_scan';
        }

        // Dangers List (Top 10 from failed files)
        if (failedFiles.length > 0) {
            let collected = 0;
            for (const f of failedFiles) {
                if (collected >= 10) break;
                const cleanContent = f.content.charCodeAt(0) === 0xFEFF ? f.content.slice(1) : f.content;
                const lines = cleanContent.split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length > 1) {
                    // Slice up to needed
                    const needed = 10 - collected;
                    const toAdd = lines.slice(1, 1 + needed);
                    toAdd.forEach(l => {
                        dangers.push({
                            level: 'danger',
                            message: l.substring(0, 200)
                        });
                        collected++;
                    });
                }
            }
            if (dangers.length > 0) {
                debugSources.dangers = 'failed_scan';
            }
        }

        // Final Safety
        newCandidates = Math.max(0, Math.round(newCandidates));
        uploadReady = Math.max(0, Math.round(uploadReady));
        mappingPending = Math.max(0, Math.round(mappingPending));
        warnings = Math.max(0, Math.round(warnings));

        // --- Phase 2-2: Extended Attributes ---
        const latestRun = {
            runId: latestRunId,
            startedAt: summaryJson?.started_at || 'Recently',
            status: summaryJson?.status || 'unknown',
            exportRows: newCandidates,
            failedRows: warnings
        };

        // 4. CTA Logic
        // Priority: warnings > mapping > upload > new > default
        let cta = { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' };

        if (warnings > 0) {
            cta = { kind: 'runs', label: 'エラーを確認', href: '/runs' };
        } else if (mappingPending > 0) {
            cta = { kind: 'mapping', label: 'マッピングを行う', href: '/mapping' };
        } else if (uploadReady > 0) {
            cta = { kind: 'upload', label: '最終TSVを確認', href: '/runs' };
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
        res.status(200).json({
            latestRunId: null,
            newCandidates: 0,
            uploadReady: 0,
            mappingPending: 0,
            warnings: 0,
            sources: debugSources,
            top10: [],
            dangers: [],
            cta: { kind: 'start', label: '新規抽出を開始', href: '/wizard/step1' }
        });
    }
}
