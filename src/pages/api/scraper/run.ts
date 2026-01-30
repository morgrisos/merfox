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
        const { url, limit = 50, filters } = req.body;

        if (!url) return res.status(400).json({ error: 'URL is required' });

        console.log('[API] Starting Scraper Run...', { url, limit });

        const dateStr = new Date().toISOString().split('T')[0];
        // Generate a run ID. Scraper class typically expects just "runXXX" or similar if handled?
        // Actually Scraper.js takes `runId` and creates folder `runsDir/runId` or similar.
        // If we want `YYYY-MM-DD_runXXX`, we need to handle that.
        // Let's use simple logic: find existing runs to increment ID?
        // Or let Scraper handle it? Scraper(runId, type, url, options).
        // Let's generate a unique enough ID: "run-" + timestamp.
        // Automation uses 'run999'. Standard Wizard should be cleaner.
        const runId = `${dateStr}_run${Math.floor(Math.random() * 900) + 100}`;

        // Pass environment
        process.env.MERFOX_RUNS_DIR = getRunsDir();

        const scraper = new Scraper(runId, 'wizard', url, {
            stopLimit: limit,
            excludeKeywords: filters?.ngWord || ''
        });

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
