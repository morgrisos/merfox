import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { MerItem } from '../types';

const AMAZON_HEADER = [
    'sku', 'product_id', 'product_id_type', 'price',
    'quantity', 'condition_type', 'condition_note',
    'handling_time', 'fulfillment_channel', 'shipping_template_name'
];

export class AmazonConverter {
    static async convert(executionDir: string, config: { minPrice?: number, maxPrice?: number }): Promise<{ converted: number, failed: number }> {
        try {
            const rawPath = path.join(executionDir, 'raw.csv');
            const rawContent = await fs.readFile(rawPath, 'utf8');
            const records = parse(rawContent, { columns: true, bom: true }) as MerItem[];

            const tsvRows = [];
            const failedRows = [];

            for (const item of records) {
                // Safety Checks / Filter again just in case
                if (!item.item_id) continue;

                // Price Filter (Double check)
                if (item.price_yen > (config.maxPrice || 100000)) continue;
                if (config.minPrice && item.price_yen < config.minPrice) continue;

                // ID Check
                // Spec says: "Mapping only". If no ID, fails.
                // However, v1.0 spec implies we output what we can, or just those with IDs?
                // Spec Section 14: "Item_id <-> product_id mapping... Only rows with mapping are output to Amazon TSV"
                // "紐付いた行だけ Amazon TSV に出す" (Only output linked rows)

                if (!item.amazon_product_id) {
                    failedRows.push({
                        item_id: item.item_id,
                        item_url: item.item_url,
                        title: item.title,
                        price: item.price_yen,
                        reason_code: 'NO_PRODUCT_ID',
                        reason_detail: 'ASIN/JAN mapping is missing',
                        suggested_action: 'Import ID table'
                    });
                    continue;
                }

                tsvRows.push([
                    `MF-${item.item_id}`,          // sku
                    item.amazon_product_id,        // product_id
                    item.amazon_product_id_type,   // product_id_type
                    item.price_yen,                // price
                    1,                             // quantity
                    'used_good',                   // condition_type
                    '中古品です。',                   // condition_note (fixed or custom?) Spec says fixed but implies note is needed. "condition_note" usually required. I'll use a safe default.
                    2,                             // handling_time
                    'MFN',                         // fulfillment_channel
                    ''                             // shipping_template_name (default empty)
                ]);
            }

            // Write TSV
            const tsvOutput = stringify(tsvRows, { header: true, columns: AMAZON_HEADER, delimiter: '\t' });
            await fs.writeFile(path.join(executionDir, 'amazon_upload.tsv'), '\ufeff' + tsvOutput);

            // Write Failed Report
            if (failedRows.length > 0) {
                const failedOutput = stringify(failedRows, { header: true });
                await fs.writeFile(path.join(executionDir, 'amazon_convert_failed.csv'), '\ufeff' + failedOutput);
            }

            return { converted: tsvRows.length, failed: failedRows.length };

        } catch (e) {
            console.error('Conversion failed', e);
            return { converted: 0, failed: 0 };
        }
    }
}
