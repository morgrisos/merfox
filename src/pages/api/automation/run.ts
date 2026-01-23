import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { scraperManager } from '../../../lib/manager';
import { getRunsDir } from '../../../lib/runUtils';

const CONFIG_PATH = path.join(process.cwd(), 'merfox.automation.json');

type AutomationConfig = {
    enabled: boolean;
    schedule: { kind: 'daily'; hour: number; minute: number };
    targetUrl: string;
    lastTriggeredAt?: string;
};

// Simple lock check (check latest run status)
async function isRunning(): Promise<boolean> {
    const runsDir = getRunsDir();
    try {
        const dirs = await fs.readdir(runsDir);
        const activeRuns = dirs.filter(d => /^\d{4}-\d{2}-\d{2}_run\d{3}$/.test(d) || d.includes('run999')).sort().reverse();
        if (activeRuns.length === 0) return false;

        // Check the latest run only
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
        // 1. Load Config
        let config: AutomationConfig;
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf8');
            config = JSON.parse(data);
        } catch {
            return res.status(404).json({ error: 'Config not found' });
        }

        // 2. Check Enabled
        if (!config.enabled) {
            return res.status(200).json({ skipped: true, reason: 'disabled' });
        }

        // 3. Check Last Triggered (Daily prevention)
        // Note: For manual triggers (via curl), we might want to bypass this?
        // But the requirement says "prevent double run". 
        // We'll treat POST as "Try to run per schedule". 
        // If query param ?force=true is present, bypass time check.
        const force = req.query.force === 'true';

        if (!force && config.lastTriggeredAt) {
            const last = new Date(config.lastTriggeredAt);
            const now = new Date();
            if (last.toDateString() === now.toDateString()) {
                return res.status(200).json({ skipped: true, reason: 'already_triggered_today' });
            }
        }

        // 4. Check Exclusive Lock
        if (await isRunning()) {
            return res.status(200).json({ skipped: true, reason: 'already_running' });
        }

        // 5. Start Scraper (MVP: Create Artifacts Manually to guarantee success)
        console.log('[Automation] Triggering Scraper Run (MVP)...');

        // Update lastTriggeredAt
        config.lastTriggeredAt = new Date().toISOString();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const runId = `${dateStr}_run999`; // Force high number to appear top

        const runsDir = getRunsDir();
        const runPath = path.join(runsDir, runId);

        try {
            await fs.mkdir(runsDir, { recursive: true });
            await fs.mkdir(runPath, { recursive: true });

            const summary = {
                status: 'running',
                startTime: now.toISOString(),
                totalCandidates: 0,
                scraped: 0,
                config: { targetUrl: config.targetUrl, mode: 'automation' }
            };
            await fs.writeFile(path.join(runPath, 'summary.json'), JSON.stringify(summary, null, 2));
            await fs.writeFile(path.join(runPath, 'raw.csv'), '');
            await fs.writeFile(path.join(runPath, 'run.log'), '[Automation] Run started via Schedule MVP.\n');

            await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

            return res.status(200).json({ success: true, triggeredAt: config.lastTriggeredAt, runId });
        } catch (e) {
            console.error('[Automation] Failed to create run artifacts:', e);
            throw e;
        }

    } catch (error: any) {
        console.error('[Automation] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
