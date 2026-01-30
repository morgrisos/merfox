import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { getRunsDir } from '../../../../lib/runUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { runId } = req.query;
    if (!runId || Array.isArray(runId)) return res.status(400).json({ error: 'Invalid runId' });

    const runDir = path.join(getRunsDir(), runId);
    const tsvPath = path.join(runDir, 'amazon_upload.tsv');

    if (!fs.existsSync(tsvPath)) {
        // [REQ 3] Diagnosis
        let reason = 'UNKNOWN';
        let detail = '';

        try {
            // Check Raw
            const rawPath = path.join(runDir, 'raw.csv');
            if (!fs.existsSync(rawPath)) {
                reason = 'RAW_MISSING';
            } else {
                const rawStats = fs.statSync(rawPath);
                if (rawStats.size < 50) reason = 'RAW_EMPTY'; // Heuristic
            }

            // Check Mapping
            const mappingPath = path.join(runDir, 'mapping.csv');
            if (!fs.existsSync(mappingPath)) {
                if (reason !== 'RAW_EMPTY') reason = 'MAPPING_MISSING';
            }

            // Check Failed CSV
            const failPath = path.join(runDir, 'amazon_convert_failed.csv');
            if (fs.existsSync(failPath)) {
                reason = 'CONVERT_FAILED';
                const fContent = fs.readFileSync(failPath, 'utf8');
                if (fContent.includes('NO_PRODUCT_ID')) detail = 'ASIN未設定 (No ID)';
            }

        } catch (e) { }

        return res.status(200).json({ exists: false, preview: [], reason, detail });
    }

    // Read first 5 lines
    const lines: string[] = [];
    const stream = fs.createReadStream(tsvPath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        lines.push(line);
        count++;
        if (count >= 6) break; // Header + 5 rows
    }

    res.status(200).json({ exists: true, preview: lines });
}
