import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { getRunDir } from '../../../../lib/runUtils';

// Default values (same as old hardcoded values — backward compat)
export const DEFAULT_LISTING_CONFIG = {
    amazon: {
        item_condition: '11',
        leadtime_to_ship: '2',
        item_note: '中古品です。',
    },
};

const ITEM_NOTE_MAX = 256;

/**
 * [P0-2] Sanitize item_note:
 * - Replace newlines and tabs with a space (prevents TSV column shift)
 * - Trim to 256 chars
 */
function sanitizeItemNote(raw: string): string {
    return raw
        .replace(/[\r\n\t]+/g, ' ')   // newlines/tabs → single space
        .replace(/\s{2,}/g, ' ')        // collapse multiple spaces
        .trim()
        .slice(0, ITEM_NOTE_MAX);        // hard cap 256 chars
}

/**
 * [P0-3] Clamp leadtime to 1–30 (server-side guard independent of UI)
 */
function clampLeadtime(raw: string): string {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return DEFAULT_LISTING_CONFIG.amazon.leadtime_to_ship;
    return String(Math.max(1, Math.min(30, n)));
}

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

    // --- POST: Sanitize + Write config ---
    if (req.method === 'POST') {
        const body = req.body;

        const rawNote = body?.amazon?.item_note ?? DEFAULT_LISTING_CONFIG.amazon.item_note;
        const rawLeadtime = body?.amazon?.leadtime_to_ship ?? DEFAULT_LISTING_CONFIG.amazon.leadtime_to_ship;

        const config = {
            amazon: {
                item_condition: body?.amazon?.item_condition ?? DEFAULT_LISTING_CONFIG.amazon.item_condition,
                leadtime_to_ship: clampLeadtime(String(rawLeadtime)),  // [P0-3 also]
                item_note: sanitizeItemNote(String(rawNote)),    // [P0-2]
            },
        };

        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
        return res.status(200).json({ ok: true, config });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
