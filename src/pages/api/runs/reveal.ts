import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import path from 'path';
import { getRunsDir } from '../../../lib/runUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { runId, file } = req.body;
    if (!runId) return res.status(400).json({ error: 'Missing runId' });

    const runsDir = getRunsDir();
    let targetPath = path.join(runsDir, runId);

    if (file) {
        // Prevent directory traversal
        if (file.includes('..') || file.includes('/')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        targetPath = path.join(targetPath, file);
    }

    // MacOS Only for now as per user OS
    const command = `open "${targetPath}"`;

    exec(command, (error) => {
        if (error) {
            console.error('Failed to open:', error);
            return res.status(500).json({ error: 'Failed to open' });
        }
        return res.status(200).json({ success: true });
    });
}
