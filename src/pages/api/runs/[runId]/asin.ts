import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getRunDir } from '../../../../lib/runUtils';
import { withLicense } from '@/lib/license/serverLicenseCheck';

// @ts-ignore
const { AsinService } = require('../../../../../server/engine/AsinService');
// @ts-ignore
const { ProviderFactory } = require('../../../../../server/engine/providers/ProviderFactory');
// @ts-ignore
const Papa = require('papaparse');

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { runId } = req.query;
    if (!runId || Array.isArray(runId)) {
        return res.status(400).json({ error: 'Invalid Run ID' });
    }

    try {
        console.log(`[FLOW] ASIN_MATCH_STARTED run_id=${runId}`);
        const runDir = await getRunDir(runId);
        
        if (!runDir) {
            return res.status(404).json({ error: 'Run directory not found' });
        }

        const rawPath = path.join(runDir, 'raw.csv');
        if (!fs.existsSync(rawPath)) {
            return res.status(404).json({ error: 'raw.csv not found in run directory' });
        }

        const rawContent = fs.readFileSync(rawPath, 'utf8');
        const parsed = Papa.parse(rawContent, { header: true, skipEmptyLines: true });
        const rows = parsed.data;

        // Execute ASIN matching
        const provider = ProviderFactory.getProvider('mock'); // For now, default to mock or config
        await AsinService.run(runDir, rows, provider);

        console.log(`[FLOW] ASIN_MATCH_COMPLETED run_id=${runId}`);
        return res.status(200).json({ success: true, count: rows.length });
    } catch (error: any) {
        console.error('[API] ASIN Match Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

export default withLicense(handler);
