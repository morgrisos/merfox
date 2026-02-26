import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { getRunDir } from '../../../../lib/runUtils';

// Default values (same as the old hardcoded values — for fallback)
export const DEFAULT_LISTING_CONFIG = {
    amazon: {
        item_condition: '11',
        leadtime_to_ship: '2',
        item_note: '中古品です。',
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { runId } = req.query;
    if (!runId || Array.isArray(runId)) {
        return res.status(400).json({ error: 'Invalid Run ID' });
    }

    const runDir = await getRunDir(runId);
    if (!runDir) {
        return res.status(404).json({ error: 'Run directory not found' });
    }

    const configPath = path.join(runDir, 'listing_config.json');

    // --- GET: Return existing config or defaults ---
    if (req.method === 'GET') {
        try {
            const raw = await fs.readFile(configPath, 'utf8');
            return res.status(200).json(JSON.parse(raw));
        } catch {
            return res.status(200).json(DEFAULT_LISTING_CONFIG);
        }
    }

    // --- POST: Write config ---
    if (req.method === 'POST') {
        const body = req.body;
        // Merge with defaults to guarantee required keys are present
        const config = {
            amazon: {
                item_condition: body?.amazon?.item_condition ?? DEFAULT_LISTING_CONFIG.amazon.item_condition,
                leadtime_to_ship: body?.amazon?.leadtime_to_ship ?? DEFAULT_LISTING_CONFIG.amazon.leadtime_to_ship,
                item_note: body?.amazon?.item_note ?? DEFAULT_LISTING_CONFIG.amazon.item_note,
            },
        };
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        return res.status(200).json({ ok: true, config });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
