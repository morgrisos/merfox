import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/runs/[runId]/config
 * Returns the config.json for a run if it exists
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { runId } = req.query;
    if (!runId || typeof runId !== 'string') {
        return res.status(400).json({ error: 'Invalid runId' });
    }

    const dataDir = process.env.MERFOX_DATA_DIR || path.join(process.env.HOME || '', 'Library/Application Support/MerFox/MerFox');
    const configPath = path.join(dataDir, 'runs', runId, 'config.json');

    if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'Config not found' });
    }

    try {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData);
        return res.status(200).json(config);
    } catch (err) {
        console.error('Failed to read config:', err);
        return res.status(500).json({ error: 'Failed to read config' });
    }
}
