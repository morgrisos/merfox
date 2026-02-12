import { NextApiRequest, NextApiResponse } from 'next';
import { getRunsDir } from '../../../lib/runUtils';

// @ts-ignore
const { Scraper } = require('../../../../server/engine/Scraper.js');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { url, limit = 50, excludeKeywords = [], runType = 'test' } = req.body;

        if (!url) return res.status(400).json({ error: 'URL is required' });

        console.log('[API] Starting Scraper Run...', { url, limit, excludeKeywords, runType });

        const dateStr = new Date().toISOString().split('T')[0];
        const runId = `${dateStr}_run${Math.floor(Math.random() * 900) + 100}`;

        // Pass environment
        process.env.MERFOX_RUNS_DIR = getRunsDir();

        const scraper = new Scraper(runId, 'wizard', url, {
            stopLimit: limit,
            excludeKeywords: excludeKeywords,
            runType: runType
        });

        // Save config.json for re-run feature
        try {
            const fs = require('fs');
            const path = require('path');
            const runDir = path.join(getRunsDir(), runId);

            // Ensure run directory exists (scraper will create it, but we do early)
            if (!fs.existsSync(runDir)) {
                fs.mkdirSync(runDir, { recursive: true });
            }

            const config = {
                url,
                ngWords: excludeKeywords,
                limit,
                mode: runType,
                categories: req.body.categories || [],
                createdAt: new Date().toISOString()
            };

            fs.writeFileSync(
                path.join(runDir, 'config.json'),
                JSON.stringify(config, null, 2)
            );
            console.log('[API] Saved config.json for runId:', runId);
        } catch (configErr) {
            console.warn('[API] Failed to save config.json:', configErr);
            // Don't fail the entire request, just log
        }

        // Run in background (don't await completion for the API response, unless we want to block?)
        // Automation ran inline. Wizard Step 2 implies progress bar.
        // We should start it and return success immediately, so Frontend can poll logs.

        // However, Scraper.start() might be async.
        // Next.js serverless might kill process if we return?
        // In "Standalone", it persists. In "Serverless" (Vercel), it kills.
        // We are building Standalone Electron.

        scraper.start().catch((err: any) => {
            console.error('[API] Scraper Background Error:', err);
        });

        return res.status(200).json({
            success: true,
            runId: runId,
            message: 'Scraping started in background'
        });

    } catch (error: any) {
        console.error('[API] Scraper Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
