import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// TODO: Move to a shared service
const getJobsFile = () => {
    const base = process.env.MERFOX_DATA_DIR || path.join(os.homedir(), 'Library/Application Support/merfox/MerFox');
    return path.join(base, 'watch_jobs.json');
};

const readJobs = async () => {
    try {
        const file = getJobsFile();
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
};

const saveJobs = async (jobs: any[]) => {
    const file = getJobsFile();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(jobs, null, 2));
};

export async function GET() {
    return NextResponse.json(await readJobs());
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const jobs = await readJobs();
        const newJob = {
            id: crypto.randomUUID(),
            targetUrl: body.targetUrl,
            intervalMinutes: body.intervalMinutes || 30,
            name: body.name || 'New Watch Job',
            isEnabled: true,
            createdAt: new Date().toISOString(),
            lastRunAt: null,
            nextRunAt: new Date(Date.now() + (body.intervalMinutes || 30) * 60000).toISOString(),
            stats: { totalRuns: 0, totalItemsFound: 0 }
        };
        jobs.push(newJob);
        await saveJobs(jobs);

        console.log('[API] Created Watch Job:', newJob.id);

        return NextResponse.json(newJob);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
