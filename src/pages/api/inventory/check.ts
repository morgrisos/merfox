import { NextApiRequest, NextApiResponse } from 'next';
import { InventoryService } from '../../../../server/engine/InventoryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { watchIds } = req.body || {};
        // If watchIds is provided, check only those. Otherwise, check all.
        const results = await InventoryService.checkItems(watchIds || []);
        
        return res.status(200).json({ success: true, checked_count: results.length, results });
    } catch (error: any) {
        console.error('Failed to check inventory items:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
