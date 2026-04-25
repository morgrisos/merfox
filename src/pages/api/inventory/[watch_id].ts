import { NextApiRequest, NextApiResponse } from 'next';
import { InventoryService } from '../../../../server/engine/InventoryService';
import { withLicense } from '@/lib/license/serverLicenseCheck';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { watch_id } = req.query;
    
    if (typeof watch_id !== 'string') {
        return res.status(400).json({ error: 'Watch ID is required' });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
        try {
            const updates = req.body;
            const updated = InventoryService.updateWatchItem(watch_id, updates);
            if (!updated) {
                return res.status(404).json({ error: 'Item not found' });
            }
            return res.status(200).json(updated);
        } catch (error: any) {
            console.error('Failed to update watch item:', error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }
    
    if (req.method === 'DELETE') {
        try {
            const items = InventoryService.getWatchItems();
            const idx = items.findIndex((i: any) => i.watch_id === watch_id);
            if (idx === -1) {
                return res.status(404).json({ error: 'Item not found' });
            }
            items.splice(idx, 1);
            InventoryService.saveWatchItems(items);
            return res.status(200).json({ success: true });
        } catch (error: any) {
             console.error('Failed to delete watch item:', error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }

    res.setHeader('Allow', ['PATCH', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLicense(handler);
