import { NextApiRequest, NextApiResponse } from 'next';
import { InventoryService } from '../../../../server/engine/InventoryService';
import { withLicense } from '@/lib/license/serverLicenseCheck';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const body = req.body || {};
        const { watchIds, force } = body;
        console.log('[INV_CHECK_START]', watchIds?.length ? `watchIds=${watchIds.length}` : 'all', `force_raw=${JSON.stringify(force)}`, `body=${JSON.stringify(body)}`);
        console.log('[INV_FORCE_FLAG]', force, typeof force, '!!force=', !!force);
        const results = await InventoryService.checkItems(watchIds || [], !!force);
        console.log('[INV_CHECK_DONE]', `results=${results.length}`);
        return res.status(200).json({ success: true, checked_count: results.length, results });
    } catch (error: any) {
        console.error('[INV_CHECK_ERROR]', error.message || error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

export default withLicense(handler);
