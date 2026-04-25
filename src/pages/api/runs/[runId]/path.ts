import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getRunsDir } from '@/lib/runUtils';
import { withLicense } from '@/lib/license/serverLicenseCheck';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { runId } = req.query;
    if (!runId || typeof runId !== 'string') {
        return res.status(400).json({ error: 'Missing runId' });
    }

    const runDir = path.join(getRunsDir(), runId);
    return res.status(200).json({ path: runDir });
}

export default withLicense(handler);
