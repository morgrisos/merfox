import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getRunDir } from '../../../../../lib/runUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).send('Method not allowed');
    }

    const { runId, type } = req.query;
    if (!runId || Array.isArray(runId) || !type || Array.isArray(type)) {
        return res.status(400).send('Invalid parameters');
    }

    const runDir = await getRunDir(runId);

    if (!runDir) {
        return res.status(404).send('Run directory not found');
    }

    let filename = '';
    const datePrefix = path.basename(runDir).split('_')[0].replace(/-/g, '');

    switch (type) {
        case 'raw': filename = 'raw.csv'; break;
        case 'log': filename = 'run.log'; break;
        case 'amazon': filename = 'amazon_upload.tsv'; break;
        case 'failed': filename = 'amazon_convert_failed.csv'; break;
        default: return res.status(400).send('Invalid file type');
    }

    const filePath = path.join(runDir, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="merfox_${type}_${datePrefix}_${runId}.${path.extname(filename).substring(1)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.write(fileBuffer);
    res.end();
}
