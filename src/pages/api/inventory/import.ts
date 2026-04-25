import { NextApiRequest, NextApiResponse } from 'next';
import { InventoryService } from '../../../../server/engine/InventoryService';
import { withLicense } from '@/lib/license/serverLicenseCheck';

function parseCSVLine(line: string) {
    const chars = line.split('');
    const result = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === '"') {
            if (inQuotes && chars[i + 1] === '"') {
                curr += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            result.push(curr);
            curr = '';
        } else {
            curr += c;
        }
    }
    result.push(curr);
    return result.map(s => s.trim());
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const payload = req.body;
        let itemsToAdd: any[] = [];

        if (payload.csvText) {
            // Parse CSV: SKU,ASIN,mercari_url,title
            const lines = payload.csvText.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
            
            // Auto detect header
            let startIndex = 0;
            if (lines[0].toLowerCase().includes('sku') && lines[0].toLowerCase().includes('asin')) {
                startIndex = 1;
            }

            for (let i = startIndex; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                if (cols.length >= 4) {
                    itemsToAdd.push({
                        amazon_sku: cols[0],
                        amazon_asin: cols[1],
                        mercari_url: cols[2],
                        amazon_title: cols[3]
                    });
                } else if (cols.length >= 3) {
                    // Fallback if title is missing
                    itemsToAdd.push({
                        amazon_sku: cols[0],
                        amazon_asin: cols[1],
                        mercari_url: cols[2],
                        amazon_title: cols[0] // fallback to sku
                    });
                }
            }
        } else if (payload.items && Array.isArray(payload.items)) {
            itemsToAdd = payload.items;
        } else {
            return res.status(400).json({ error: 'Please provide either csvText or items array' });
        }

        if (itemsToAdd.length === 0) {
            return res.status(400).json({ error: 'No valid items found' });
        }

        let added = 0;
        let skipped = 0;

        for (const item of itemsToAdd) {
            try {
                InventoryService.addWatchItem(item);
                added++;
            } catch (e: any) {
                // Ignore duplicates
                skipped++;
            }
        }

        return res.status(200).json({ added, skipped, total: itemsToAdd.length });

    } catch (error: any) {
        console.error('Failed to import items:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

export default withLicense(handler);
