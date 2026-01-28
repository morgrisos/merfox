import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

import { getRunsDir, getConfigPath } from '../../../lib/runUtils';
import { AmazonConverter } from '../../../lib/converter';

// @ts-ignore
// Fix path: src/pages/api/automation -> 4 levels up to root
const { Scraper } = require('../../../../server/engine/Scraper.js');

const CONFIG_PATH = getConfigPath();

type AutomationConfig = {
    enabled: boolean;
    schedule: { kind: 'daily'; hour: number; minute: number };
    targetUrl: string;
    lastTriggeredAt?: string;
};

// ... isRunning check ...
async function isRunning(): Promise<boolean> {
    const runsDir = getRunsDir();
    try {
        const dirs = await fs.readdir(runsDir);
        const activeRuns = dirs.filter(d => /^\d{4}-\d{2}-\d{2}_run\d{3}$/.test(d) || d.includes('run999')).sort().reverse();
        if (activeRuns.length === 0) return false;
        const latestRun = activeRuns[0];
        try {
            const summaryPath = path.join(runsDir, latestRun, 'summary.json');
            const data = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
            if (data.status === 'running') return true;
        } catch { }
    } catch { }
    return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 1. Config Load
        let config: AutomationConfig;
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf8');
            config = JSON.parse(data);
        } catch {
            console.log('[Automation] Config missing, creating default.');
            config = {
                enabled: true,
                schedule: { kind: 'daily', hour: 12, minute: 0 },
                targetUrl: 'https://jp.mercari.com/search?keyword=test', // Safest default
                lastTriggeredAt: ''
            };
            await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
            await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
        }

        if (!config.enabled) return res.status(200).json({ skipped: true, reason: 'disabled' });

        const force = req.query.force === 'true';
        if (!force && config.lastTriggeredAt) {
            const last = new Date(config.lastTriggeredAt);
            const now = new Date();
            if (last.toDateString() === now.toDateString()) {
                return res.status(200).json({ skipped: true, reason: 'already_triggered_today' });
            }
        }

        if (await isRunning()) return res.status(200).json({ skipped: true, reason: 'already_running' });

        // 2. Start Scraper
        console.log('[Automation] Starting Real Scraper Run...');
        config.lastTriggeredAt = new Date().toISOString();
        const dateStr = new Date().toISOString().split('T')[0];
        const runId = `run999`; // Keep consistent with user observation

        // Pass environment for Scraper to find dirs
        process.env.MERFOX_RUNS_DIR = getRunsDir();

        // Instantiate Scraper
        const scraper = new Scraper(runId, 'automation', config.targetUrl, {
            stopLimit: 50,
            excludeKeywords: '' // Get from config if exists
        });

        // Run async (fire and forget for API response, OR wait?)
        // Automation is usually background. But for "Run Now" debug, waiting is better to see errors.
        // Given this is an internal API called by scheduler/curl, let's WAIT for critical parts.
        // Actually, Vercel/Next.js function timeouts are short. Background is safer.
        // But for Electron Standalone, no timeout limit usually. 
        // We'll Execute logic, but maybe return early?
        // User wants "reason" in log. If we return early, user sees "started".
        // Let's run it inline.

        await scraper.start(); // This runs the whole scrape (Playwright)

        // 3. Post-Scrape: Converter
        const stats = scraper.stats;
        let convertResult: { converted: number, failed: number, failedNoId: number, error?: string } = { converted: 0, failed: 0, failedNoId: 0, error: '' };

        if (stats.success > 0) {
            console.log('[Automation] Scrape success. running converter...');
            const runPath = scraper.runDir; // Scraper sets this

            // Generate mapping.csv if needed? 
            // Automation assumes mapping exists or we skip?
            // User requirement: "0 valid rows -> NO TSV".
            // AmazonConverter will handle it.

            // We need to pass config (minPrice/maxPrice) if exists.
            convertResult = await AmazonConverter.convert(runPath, {});

            // Update Summary with convert stats
            const summaryPath = path.join(runPath, 'summary.json');
            try {
                const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8').catch(() => '{}'));
                summary.convert = convertResult;
                summary.status = 'completed';
                await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
            } catch (e) { }

        } else {
            console.log('[Automation] 0 candidates found. Skipping converter.');
            // Update status to 'completed' (or 'failed' if error) inside Scraper?
            // Scraper.js updates summary? No it emits 'done'.
            // We rely on Scraper.js logSummary mainly. 
        }

        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

        // Check for 0 candidates failure
        if (stats.total === 0) {
            // API Response should indicate this
            // But we might have already responded? No we waited.
            return res.status(200).json({
                success: true,
                runId: `${dateStr}_${runId}`,
                candidates: 0,
                message: 'No candidates found. Check run.log for [Diagnosis].'
            });
        }

        return res.status(200).json({
            success: true,
            runId: `${dateStr}_${runId}`,
            candidates: stats.success,
            converted: convertResult.converted
        });

    } catch (error: any) {
        console.error('[Automation] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
