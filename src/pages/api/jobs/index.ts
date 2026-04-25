import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { getJobsPath } from '@/lib/runUtils';
import { withLicense } from '@/lib/license/serverLicenseCheck';

// Migrate from legacy process.cwd() path if needed
function migrateIfNeeded(jobsFile: string) {
    // [P3-3] RISK-08: process.cwd() in packaged Electron points into app.asar (read-only).
    // Skip these candidates in production where MERFOX_USER_DATA is always set.
    const legacyCandidates: string[] = process.env.MERFOX_USER_DATA ? [] : [
        path.join(process.cwd(), 'merfox.jobs.json'),
        path.join(process.cwd(), 'standalone', 'merfox.jobs.json'),
    ];
    if (!fs.existsSync(jobsFile)) {
        for (const old of legacyCandidates) {
            if (fs.existsSync(old)) {
                try {
                    fs.mkdirSync(path.dirname(jobsFile), { recursive: true });
                    fs.copyFileSync(old, jobsFile);
                    console.log('[JOBS_MIGRATE]', `from=${old}`, `to=${jobsFile}`);
                } catch (e) {
                    console.error('[JOBS_MIGRATE_ERROR]', e);
                }
                break;
            }
        }
    }
    // Initialize empty file if still missing
    if (!fs.existsSync(jobsFile)) {
        try {
            fs.mkdirSync(path.dirname(jobsFile), { recursive: true });
            fs.writeFileSync(jobsFile, JSON.stringify([], null, 2));
            console.log('[JOBS_INIT]', jobsFile);
        } catch (e) {
            console.error('[JOBS_INIT_ERROR]', e);
        }
    }
}

interface WatchJob {
    id: string;
    targetUrl: string;
    isEnabled: boolean;
    intervalMinutes: number;
    lastRunAt: string | null;
    nextRunAt: string | null;
    stats: { totalRuns: number; totalItemsFound: number };
}

async function loadJobs(): Promise<WatchJob[]> {
    const jobsFile = getJobsPath();
    console.log('[WATCH_JOBS_PATH]', jobsFile, 'exists=', fs.existsSync(jobsFile));
    migrateIfNeeded(jobsFile);
    try {
        const data = await fsPromises.readFile(jobsFile, 'utf8');
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            console.error('[SCRAPER_DATA_SHAPE_ERROR] merfox.jobs.json is not an array — resetting');
            return [];
        }
        console.log('[WATCH_JOBS_LOAD]', parsed.length, 'jobs');
        return parsed;
    } catch (e: any) {
        if (e.code === 'ENOENT') return [];
        throw e;
    }
}

async function saveJobs(jobs: WatchJob[]): Promise<void> {
    const jobsFile = getJobsPath();
    await fsPromises.mkdir(path.dirname(jobsFile), { recursive: true });
    await fsPromises.writeFile(jobsFile, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('[WATCH_JOBS_SAVE]', jobs.length, 'jobs ->', jobsFile);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const jobs = await loadJobs();
            console.log('[JOB_LOAD]', jobs.length, getJobsPath());
            return res.status(200).json(jobs);
        } catch (e: any) {
            console.error('[JOB_LOAD_ERROR]', e.message);
            return res.status(500).json({ error: 'Failed to load jobs' });
        }
    }

    if (req.method === 'POST') {
        try {
            const job: WatchJob = req.body;
            if (!job.id || !job.targetUrl) {
                return res.status(400).json({ error: 'id and targetUrl are required' });
            }
            const jobs = await loadJobs();
            jobs.push(job);
            await saveJobs(jobs);
            console.log('[JOB_CREATE]', job.id);
            return res.status(201).json(job);
        } catch (e: any) {
            console.error('[JOB_CREATE_ERROR]', e.message);
            return res.status(500).json({ error: 'Failed to create job' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLicense(handler);
