import { NextApiRequest, NextApiResponse } from 'next';
import { withLicense } from '@/lib/license/serverLicenseCheck';
import { scraperManager } from '../../../lib/manager';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    console.log('[API] Stop requested');
    await scraperManager.stop();
    return res.status(200).json({ success: true });
}

export default withLicense(handler);
