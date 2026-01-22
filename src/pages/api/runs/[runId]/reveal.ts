import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { getRunDir } from '../../../../lib/runUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { runId } = req.query;
    if (!runId || Array.isArray(runId)) return res.status(400).json({ error: 'Invalid Run ID' });

    const runDir = await getRunDir(runId);

    if (!runDir) {
        return res.status(404).json({ error: 'Run directory not found' });
    }

    const cmd = process.platform === 'darwin' ? `open -R "${runDir}"` :
        process.platform === 'win32' ? `explorer "${runDir}"` :
            `xdg-open "${runDir}"`;

    exec(cmd, (error) => {
        if (error) {
            console.error('[API] Reveal error:', error);
            res.status(500).json({ error: 'Failed to reveal' });
        } else {
            res.status(200).json({ success: true, path: runDir });
        }
    });
}
