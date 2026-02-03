import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { MerItem } from '../types';


// [REQ 4] Official Amazon Inventory Loader Header (Fixed)
// Using standard headers (dashes).
const AMAZON_HEADER = [
    'sku',
    'product-id',
    'product-id-type',
    'price',
    'minimum-seller-allowed-price',
    'maximum-seller-allowed-price',
    'item-condition',
    'quantity',
    'add-delete',
    'will-ship-internationally',
    'expedited-shipping',
    'standard-plus',
    'item-note',
    'fulfillment-center-id',
    'product-tax-code',
    'leadtime-to-ship',
    'merchant_shipping_group_name'
];

export class AmazonConverter {
    static async convert(executionDir: string, config: { minPrice?: number, maxPrice?: number }): Promise<{ converted: number, failed: number, failedNoId: number, error?: string }> {
        try {
            // ... (Mapping Load logic remains same, skipping for brevity in thought, but must implement full) ...
            // I'll reuse the existing mapping load logic by reading file or just assume it is there.
            // Wait, I need to replace the WHOLE file content. 
            // I will copy the mapping logic from previous `view_file` output.

            // [MAPPING LOAD]
            const mappingPath = path.join(executionDir, 'mapping.csv');
            const runLogPath = path.join(executionDir, 'run.log');
            let mapping = new Map<string, { id: string, type: string }>();

            const appendLog = async (msg: string) => {
                const line = `[${new Date().toISOString()}] ${msg}\n`;
                await fs.appendFile(runLogPath, line).catch(() => { });
            };

            await appendLog(`[CONVERT] START run_dir=${executionDir}`);

            try {
                // Check file existence via stat implicitly or explicitly
                await fs.stat(mappingPath);
                const mappingContent = await fs.readFile(mappingPath, 'utf8');
                const mapRecords = parse(mappingContent, {
                    columns: true,
                    bom: true,
                    skip_empty_lines: true,
                    relax_column_count: true
                });

                for (const row of mapRecords as any[]) {
                    if (row.item_id && row.amazon_product_id) {
                        mapping.set(row.item_id, {
                            id: row.amazon_product_id,
                            type: row.amazon_product_id_type || 'ASIN'
                        });
                    }
                }
                await appendLog(`[CONVERT] Loaded ${mapping.size} mappings`);
            } catch (e: any) {
                if (e.code !== 'ENOENT') await appendLog(`[CONVERT] Mapping Error: ${e.message}`);
            }

            const rawPath = path.join(executionDir, 'raw.csv');
            if (!(await fs.stat(rawPath).catch(() => false))) {
                return { converted: 0, failed: 0, failedNoId: 0, error: 'Raw data not found' };
            }
            const rawContent = await fs.readFile(rawPath, 'utf8');
            const records = parse(rawContent, { columns: true, bom: true }) as MerItem[];

            const tsvRows = [];
            const failedRows = [];
            const reportRows = [];
            let noProductIdCount = 0;

            for (const item of records) {
                const report = { item_id: item.item_id, status: 'SUCCESS', message: '' };
                if (!item.item_id) continue;

                // Price Filter
                if (item.price_yen > (config.maxPrice || 100000)) {
                    report.status = 'SKIPPED_PRICE';
                    report.message = 'Price too high';
                    reportRows.push(report);
                    continue;
                }

                // ID Mapping
                if (!item.amazon_product_id) {
                    const mapped = mapping.get(item.item_id);
                    if (mapped) {
                        item.amazon_product_id = mapped.id;
                        item.amazon_product_id_type = mapped.type;
                    }
                }

                // [REQ 1] Mandatory Check
                // 1. Product ID
                if (!item.amazon_product_id) {
                    noProductIdCount++;
                    failedRows.push({
                        item_id: item.item_id,
                        reason_code: 'NO_PRODUCT_ID',
                        reason_detail: 'ASIN/JAN MAPPING REQUIRED',
                        price: item.price_yen
                    });
                    report.status = 'FAILED';
                    report.message = 'No Product ID';
                    reportRows.push(report);
                    continue;
                }

                // 2. Price Safety
                if (!item.price_yen || isNaN(Number(item.price_yen))) {
                    console.warn('Invalid price', item);
                    continue;
                }

                // Construct Row (Fixed Template)
                tsvRows.push([
                    `MF-${item.item_id}`,              // sku
                    item.amazon_product_id,            // product-id
                    item.amazon_product_id_type || 'ASIN', // product-id-type
                    item.price_yen,                    // price
                    '',                                // min-price
                    '',                                // max-price
                    '11',                              // item-condition (11=Used Good)
                    1,                                 // quantity
                    'a',                               // add-delete (a=add)
                    '',                                // will-ship
                    '',                                // expedited
                    '',                                // standard-plus
                    '中古品です。',                       // item-note
                    '',                                // fulfillment-id
                    '',                                // tax-code
                    '2',                               // leadtime (days)
                    ''                                 // merchant_shipping_group
                ]);
                reportRows.push(report);
            }

            // [REQ 2] 0 Rows Check
            const tsvPath = path.join(executionDir, 'amazon_upload.tsv');
            if (tsvRows.length === 0) {
                await appendLog('[CONVERT] 0 valid rows generated. Skipping TSV creation.');
                // Ensure we remove old TSV if exists to avoid confusion
                await fs.unlink(tsvPath).catch(() => { });

                // Write failed report
                if (failedRows.length > 0) {
                    const failedOutput = stringify(failedRows, { header: true });
                    await fs.writeFile(path.join(executionDir, 'amazon_convert_failed.csv'), '\ufeff' + failedOutput);
                }
                return { converted: 0, failed: failedRows.length, failedNoId: noProductIdCount, error: 'No valid items to export (Check mappings)' };
            }

            // Write TSV
            const tsvOutput = stringify(tsvRows, { header: true, columns: AMAZON_HEADER, delimiter: '\t' });
            await fs.writeFile(tsvPath, '\ufeff' + tsvOutput);

            // Write Failed
            if (failedRows.length > 0) {
                const failedOutput = stringify(failedRows, { header: true });
                await fs.writeFile(path.join(executionDir, 'amazon_convert_failed.csv'), '\ufeff' + failedOutput);
            }

            // [REQ 2-3] Enhanced Logging
            const candidateCount = records.length;
            let mappedCount = 0;
            let validCount = 0;

            for (const item of records) {
                // ... (existing loop logic)

                // ID Mapping
                if (!item.amazon_product_id) {
                    const mapped = mapping.get(item.item_id);
                    if (mapped) {
                        item.amazon_product_id = mapped.id;
                        item.amazon_product_id_type = mapped.type;
                    }
                }

                if (item.amazon_product_id) mappedCount++;

                // ... (rest of validation) ...

                // If valid
                // tsvRows.push(...)
                // validCount++ (implicitly tsvRows.length)
            }

            validCount = tsvRows.length;
            await appendLog(`[CONVERT] candidates=${candidateCount} mapped=${mappedCount} valid=${validCount}`);

            if (validCount === 0) {
                await appendLog(`[CONVERT] Skip TSV creation. (mapped=${mappedCount}/${candidateCount})`);
                // ... existing 0-row handling ...
            }

            return { converted: tsvRows.length, failed: failedRows.length, failedNoId: noProductIdCount };

        } catch (e: any) {
            console.error('Conversion failed', e);
            return { converted: 0, failed: 0, failedNoId: 0, error: e.message };
        }
    }
}
