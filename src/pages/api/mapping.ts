import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync'; // Using sync for simplicity/safety in this MVP
import { getRunsDir, getGlobalMappingPath } from '../../lib/runUtils';

// Helper: Normalize string for header comparison
function normalizeHeader(h: string): string {
    return h.trim().toLowerCase().replace(/['"_\s]/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const runsDir = getRunsDir();

        // 1. Find Latest Run
        let latestRunDir = '';
        let latestRunId = '';
        try {
            const entries = await fs.readdir(runsDir, { withFileTypes: true });
            const dirs = entries.filter(e => e.isDirectory()).map(e => ({ name: e.name, path: path.join(runsDir, e.name) }));

            if (dirs.length > 0) {
                // Determine latest by mtime
                const stats = await Promise.all(dirs.map(async d => {
                    try {
                        const s = await fs.stat(d.path);
                        return { ...d, mtimeMs: s.mtimeMs };
                    } catch { return { ...d, mtimeMs: 0 }; }
                }));
                stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
                latestRunDir = stats[0].path;
                latestRunId = stats[0].name;
            }
        } catch { }

        if (!latestRunDir) {
            return res.status(404).json({ error: 'No runs found' });
        }

        let mappingPath = getGlobalMappingPath();
        let csvContent = '';

        try {
            csvContent = await fs.readFile(mappingPath, 'utf8');
        } catch {
            // If Global Mapping missing, try LATEST RUN raw.csv to seed
            try {
                const rawPath = path.join(latestRunDir, 'raw.csv');
                csvContent = await fs.readFile(rawPath, 'utf8');
            } catch (e2) {
                return res.status(404).json({ error: 'mapping.csv (Global) not found and raw.csv (Local) missing.' });
            }
        }

        // BOM safe
        const bomSafeContent = csvContent.charCodeAt(0) === 0xFEFF ? csvContent.slice(1) : csvContent;

        // Parse
        // relax_column_count: strict CSV creation but sometimes sloppy inputs. true is safer for read.
        const records = parse(bomSafeContent, { columns: true, skip_empty_lines: true, relax_column_count: true }) as any[];

        // Extract content lines to determine header line if we parse manually,
        // but csv-parse `columns: true` uses first line.
        // To preserve header *order* for writing, we need the raw keys from the first record (or logic below).

        // Parse Headers (using first line of content for explicit ordering check if needed,
        // or just Object.keys of first record if records > 0)
        let headers: string[] = [];
        if (records.length > 0) {
            headers = Object.keys(records[0]);
        } else {
            // If empty but file exists, try to read first line manually
            const firstLine = bomSafeContent.split(/\r?\n/)[0];
            if (firstLine) {
                const firstLineParsed = parse(firstLine, { relax_column_count: true }) as any[];
                if (firstLineParsed.length > 0) headers = firstLineParsed[0] as string[];
            }
        }

        // Identify Columns
        const normHeaders = headers.map(h => ({ original: h, norm: normalizeHeader(h) }));

        const findCol = (candidates: string[]) => {
            const index = normHeaders.findIndex(h => candidates.some(c => h.norm === c || h.norm.includes(c)));
            return index !== -1 ? normHeaders[index].original : null;
        };

        const idCol = findCol(['itemid', 'id', 'merid', 'mercariid']) || findCol(['url']) || 'item_id'; // Default if Not Found, but better to be safe
        const titleCol = findCol(['title', 'name']) || 'title';
        const asinCol = findCol(['asin', 'amazonasin', 'amazonid', 'asincode', 'amazonproductid', 'amazon_product_id']);
        const imgCol = findCol(['image', 'img', 'thumb']);

        if (req.method === 'GET') {
            const rows = [];
            let pendingCount = 0;

            for (const r of records) {
                const asinVal = asinCol ? r[asinCol]?.trim() : '';
                const isPending = !asinVal;

                if (isPending) pendingCount++;

                // Limit rows for response payload, but continue loop for counting pending
                if (rows.length < 50) {
                    // Generate Row Key (unique ident)
                    let rowKey = r[idCol];
                    if (!rowKey && idCol === 'url' && r['url']) rowKey = r['url']; // Specific fallback
                    if (!rowKey && headers.includes('url')) rowKey = r['url'];
                    if (!rowKey) rowKey = r[Object.keys(r)[0]]; // Extreme fallback: first col

                    rows.push({
                        rowKey,
                        id: r[idCol] || 'Unknown',
                        title: r[titleCol] || '',
                        image: (imgCol && r[imgCol]) || '',
                        asin: asinVal,
                        isPending,
                        // Context fields if available
                        price: r['price'] || r['item_price'] || '',
                        url: r['url'] || r['item_url'] || ''
                    });
                }
            }

            // Should total be records.length?
            // "meta.pending must be total count" -> YES.

            return res.status(200).json({
                runId: latestRunId,
                rows,
                meta: {
                    asinCol: asinCol || 'MISSING',
                    total: records.length,
                    pending: pendingCount
                }
            });
        }

        if (req.method === 'POST') {
            const { updates } = req.body; // { rowKey: newAsin }
            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({ error: 'Invalid updates payload' });
            }

            if (!asinCol) {
                return res.status(400).json({ error: 'Cannot update: No ASIN column identified' });
            }

            let updatedCount = 0;
            const newRecords = records.map((r: any) => {
                // Resolve Row Key again to match
                let rowKey = r[idCol];
                if (!rowKey && idCol === 'url' && r['url']) rowKey = r['url'];
                if (!rowKey && headers.includes('url')) rowKey = r['url'];
                if (!rowKey) rowKey = r[Object.keys(r)[0]];

                if (updates[rowKey] !== undefined) {
                    r[asinCol] = updates[rowKey]; // Update value
                    updatedCount++;
                }
                return r;
            });

            // Write Back
            // Use csv-stringify to ensure formatting. 
            // Constraint: Preserve Header Order.

            const stringifier = stringify(newRecords, {
                header: true,
                columns: headers, // Force original header order
                quoted_string: true // Safer for URLs/Titles containing commas
            });

            // If we fell back to raw.csv, we are now SAVING as mapping.csv (Global).
            // Always save to Global Path.
            await fs.writeFile(getGlobalMappingPath(), stringifier, 'utf8');

            // [FIX] Also save to Run Local Path so Converter (which reads executionDir/mapping.csv)
            // gets the UI updates.
            if (latestRunDir) {
                const localPath = path.join(latestRunDir, 'mapping.csv');
                await fs.writeFile(localPath, stringifier, 'utf8');
            }

            return res.status(200).json({ success: true, updatedCount });
        }

    } catch (e: any) {
        console.error('Mapping API Error:', e);
        res.status(500).json({ error: e.message });
    }
}
