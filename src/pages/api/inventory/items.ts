import { NextApiRequest, NextApiResponse } from 'next';
import { InventoryService } from '../../../../server/engine/InventoryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const items = InventoryService.getWatchItems();
            // Sort by updated_at descending
            items.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            return res.status(200).json(items);
        } catch (error: any) {
            console.error('Failed to get watch items:', error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }

    if (req.method === 'POST') {
        try {
            const newItem = InventoryService.addWatchItem(req.body);
            return res.status(201).json(newItem);
        } catch (error: any) {
            console.error('Failed to add watch item:', error);
            // 400 for validation errors
            return res.status(400).json({ error: error.message || 'Bad Request' });
        }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
}
