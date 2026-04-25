import { NextApiRequest, NextApiResponse } from 'next';
import fsPromises from 'fs/promises';
import path from 'path';
import { getJobsPath } from '@/lib/runUtils';
import { withLicense } from '@/lib/license/serverLicenseCheck';

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
    try {
        const data = await fsPromises.readFile(jobsFile, 'utf8');
        return JSON.parse(data);
    } catch (e: any) {
        if (e.code === 'ENOENT') return [];
        throw e;
    }
}

async function saveJobs(jobs: WatchJob[]): Promise<void> {
    const jobsFile = getJobsPath();
    await fsPromises.mkdir(path.dirname(jobsFile), { recursive: true });
    await fsPromises.writeFile(jobsFile, JSON.stringify(jobs, null, 2), 'utf8');
    console.log('[JOBS_SAVE]', jobs.length, jobsFile);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query as { id: string };
    console.log('[JOBS_PATH]', getJobsPath());

    if (req.method === 'DELETE') {
        try {
            console.log('[JOB_DELETE_REQUEST]', id);
            const jobs = await loadJobs();
            const filtered = jobs.filter(j => j.id !== id);
            if (filtered.length === jobs.length) {
                return res.status(404).json({ error: 'Job not found' });
            }
            await saveJobs(filtered);
            console.log('[JOB_DELETE_SUCCESS]', id);
            return res.status(200).json({ success: true });
        } catch (e: any) {
            console.error('[JOB_DELETE_ERROR]', id, e.message);
            return res.status(500).json({ error: 'Failed to delete job' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const jobs = await loadJobs();
            const idx = jobs.findIndex(j => j.id === id);
            if (idx === -1) {
                return res.status(404).json({ error: 'Job not found' });
            }
            jobs[idx] = { ...jobs[idx], ...req.body };
            await saveJobs(jobs);
            console.log('[JOB_UPDATE]', id);
            return res.status(200).json(jobs[idx]);
        } catch (e: any) {
            console.error('[JOB_UPDATE_ERROR]', id, e.message);
            return res.status(500).json({ error: 'Failed to update job' });
        }
    }

    res.setHeader('Allow', ['DELETE', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLicense(handler);
