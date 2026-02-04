
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';

function findColumnValue(record: any, candidates: string[]): string | undefined {
    const keys = Object.keys(record);
    for (const candidate of candidates) {
        if (record[candidate] !== undefined) return record[candidate];
        const foundKey = keys.find(k => k.toLowerCase() === candidate.toLowerCase());
        if (foundKey) return record[foundKey];
    }
    return undefined;
}

export async function GET() {
    try {
        let runsDir = process.env.MERFOX_RUNS_DIR;
        if (!runsDir) {
            runsDir = path.join(os.homedir(), 'Library/Application Support/merfox/MerFox/runs');
        }

        console.log(`[API] Scanning runs dir: ${runsDir}`);

        try {
            await fs.access(runsDir);
        } catch {
            console.warn(`[API] Runs directory not found: ${runsDir}`);
            return NextResponse.json([]);
        }

        const entries = await fs.readdir(runsDir, { withFileTypes: true });
        const runDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

        const runs = [];

        for (const dirName of runDirs) {
            const fullPath = path.join(runsDir, dirName);
            const runFiles = await fs.readdir(fullPath);

            const stats = {
                totalScanned: 0,
                success: 0,
                failed: 0,
                excluded: 0
            };

            const failureReasonMap = new Map<string, number>();
            const failedUrls = [];

            // Scan for *_failed.csv
            const failedCsvs = runFiles.filter(f => f.endsWith('_failed.csv'));

            for (const csvFile of failedCsvs) {
                try {
                    const content = await fs.readFile(path.join(fullPath, csvFile), 'utf8');
                    const bomSafe = content.startsWith('\uFEFF') ? content.slice(1) : content;

                    const records = parse(bomSafe, {
                        columns: true,
                        skip_empty_lines: true,
                        relax_column_count: true
                    });

                    stats.failed += records.length;

                    // Collect unknown headers if needed
                    // const headers = Object.keys(records[0] || {});

                    for (const record of records) {
                        const reason = findColumnValue(record, ['reason_detail', 'reason', 'error', 'message', 'detail']) || 'Unknown';
                        failureReasonMap.set(reason, (failureReasonMap.get(reason) || 0) + 1);

                        if (failedUrls.length < 20) {
                            const url = findColumnValue(record, ['item_url', 'url', 'link']);
                            const title = findColumnValue(record, ['title', 'item_title', 'name']);
                            if (url) {
                                failedUrls.push({
                                    url,
                                    reason,
                                    title: title || 'No Title'
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[API] Failed to parse ${csvFile} in ${dirName}`, e);
                }
            }

            // Count Success
            if (runFiles.includes('amazon.tsv')) {
                try {
                    const content = await fs.readFile(path.join(fullPath, 'amazon.tsv'), 'utf8');
                    const lines = content.trim().split('\n');
                    if (lines.length > 1) stats.success = lines.length - 1;
                } catch { }
            } else if (runFiles.includes('raw.csv')) {
                try {
                    const content = await fs.readFile(path.join(fullPath, 'raw.csv'), 'utf8');
                    const lines = content.trim().split('\n');
                    if (lines.length > 1) stats.success = lines.length - 1;
                } catch { }
            }

            stats.totalScanned = stats.success + stats.failed;

            const sortedReasons = Array.from(failureReasonMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => ({ reason, count }));

            let id = dirName;
            let date = '';

            const dateMatch = dirName.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) date = dateMatch[1];

            const uuidMatch = dirName.match(/([a-f0-9-]{36})/);
            if (uuidMatch) id = uuidMatch[1];

            if (!date) {
                const stat = await fs.stat(fullPath);
                date = stat.birthtime.toISOString().split('T')[0];
            }

            // Check if config.json exists
            const configExists = runFiles.includes('config.json');

            runs.push({
                id,
                name: dirName,
                date,
                path: fullPath,
                stats,
                failureReasons: sortedReasons,
                failedUrls,
                configExists,
                artifacts: {
                    hasGoogle: false,
                    hasAmazon: runFiles.includes('amazon.tsv'),
                    hasProfit: runFiles.includes('profit.tsv'),
                    hasAsin: runFiles.includes('asin.tsv'),
                    hasRaw: runFiles.includes('raw.csv')
                }
            });
        }

        runs.sort((a, b) => b.name.localeCompare(a.name));

        return NextResponse.json(runs);

    } catch (e) {
        console.error('[API] Error fetching runs:', e);
        return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }
}
