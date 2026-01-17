import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const getJobsFile = () => {
    const base = process.env.MERFOX_DATA_DIR || path.join(os.homedir(), 'Library/Application Support/merfox/MerFox');
    return path.join(base, 'watch_jobs.json');
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const file = getJobsFile();
        const data = await fs.readFile(file, 'utf8');
        const jobs = JSON.parse(data);
        const job = jobs.find((j: any) => j.id === id);

        if (job) {
            job.isEnabled = true;
            await fs.writeFile(file, JSON.stringify(jobs, null, 2));
            console.log('[API] Enabled Watch Job:', id);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
