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
    static async convert(executionDir: string, config: { minPrice?: number, maxPrice?: number }): Promise<{ converted: number, failed: number, failedNoId: number }> {
        try {
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
                // Check exist/size
                const stats = await fs.stat(mappingPath);
                console.log(`[CONVERT] mapping.csv found. size=${stats.size} bytes`);

                const mappingContent = await fs.readFile(mappingPath, 'utf8');
                // Allow loose parsing for mapping
                const mapRecords = parse(mappingContent, {
                    columns: true,
                    bom: true,
                    skip_empty_lines: true,
                    relax_column_count: true
                });

                await appendLog(`[CONVERT] mapping.csv detected. exists=true size=${stats.size} rows=${mapRecords.length}`);

                for (const row of mapRecords as any[]) {
                    if (row.item_id && row.amazon_product_id) {
                        mapping.set(row.item_id, {
                            id: row.amazon_product_id,
                            type: row.amazon_product_id_type || 'ASIN'
                        });
                    }
                }
                console.log(`[CONVERT] Loaded ${mapping.size} mappings from mapping.csv`);
                await appendLog(`[CONVERT] Loaded ${mapping.size} mappings`);

            } catch (e: any) {
                if (e.code === 'ENOENT') {
                    console.log('[CONVERT] No mapping.csv found, skipping mapping load.');
                    await appendLog(`[CONVERT] mapping.csv detected. exists=false`);
                } else {
                    console.log('[CONVERT] Failed to load mapping.csv', e);
                    await appendLog(`[CONVERT] Failed to load mapping.csv: ${e.message}`);
                }
            }

            const rawPath = path.join(executionDir, 'raw.csv');
            const rawContent = await fs.readFile(rawPath, 'utf8');
            const records = parse(rawContent, { columns: true, bom: true }) as MerItem[];

            const tsvRows = [];
            const failedRows = [];
            const reportRows = [];
            let noProductIdCount = 0;

            for (const item of records) {
                const report = { item_id: item.item_id, status: 'SUCCESS', message: '' };

                // Safety Checks / Filter again just in case
                if (!item.item_id) {
                    continue;
                }

                // Price Filter
                if (item.price_yen > (config.maxPrice || 100000)) {
                    report.status = 'SKIPPED_PRICE';
                    report.message = `Price ${item.price_yen} > ${config.maxPrice}`;
                    reportRows.push(report);
                    continue;
                }
                if (config.minPrice && item.price_yen < config.minPrice) {
                    report.status = 'SKIPPED_PRICE';
                    report.message = `Price ${item.price_yen} < ${config.minPrice}`;
                    reportRows.push(report);
                    continue;
                }

                // [ID MAPPING APPLY]
                if (!item.amazon_product_id) {
                    const mapped = mapping.get(item.item_id);
                    if (mapped) {
                        item.amazon_product_id = mapped.id;
                        item.amazon_product_id_type = mapped.type;
                    }
                }

                // ID Check
                if (!item.amazon_product_id) {
                    noProductIdCount++;
                    const reason = 'ASIN/JAN mapping is missing';

                    failedRows.push({
                        item_id: item.item_id,
                        item_url: item.item_url,
                        title: item.title,
                        price: item.price_yen,
                        reason_code: 'NO_PRODUCT_ID',
                        reason_detail: reason,
                        suggested_action: 'Import ID table'
                    });

                    report.status = 'FAILED';
                    report.message = reason;
                    reportRows.push(report);
                    continue;
                }

                tsvRows.push([
                    `MF-${item.item_id}`,          // sku
                    item.amazon_product_id,        // product_id
                    item.amazon_product_id_type || 'ASIN',   // product_id_type
                    item.price_yen,                // price
                    1,                             // quantity
                    'used_good',                   // condition_type
                    '中古品です。',                   // condition_note
                    2,                             // handling_time
                    'MFN',                         // fulfillment_channel
                    ''                             // shipping_template_name
                ]);

                reportRows.push(report);
            }

            // Write TSV
            const tsvOutput = stringify(tsvRows, { header: true, columns: AMAZON_HEADER, delimiter: '\t' });
            await fs.writeFile(path.join(executionDir, 'amazon_upload.tsv'), '\ufeff' + tsvOutput);

            // Write Failed CSV
            if (failedRows.length > 0) {
                const failedOutput = stringify(failedRows, { header: true });
                await fs.writeFile(path.join(executionDir, 'amazon_convert_failed.csv'), '\ufeff' + failedOutput);
            }

            // [REPORT] Write Full Report
            if (reportRows.length > 0) {
                const reportOutput = stringify(reportRows, { header: true, columns: ['item_id', 'status', 'message'] });
                await fs.writeFile(path.join(executionDir, 'amazon_convert_report.csv'), '\ufeff' + reportOutput);
            }

            // [FAILED URLS] Append failure to failed_urls.csv for convenience
            if (failedRows.length > 0) {
                const timestamp = new Date().toISOString();
                let failedUrlsContent = '';
                for (const row of failedRows) {
                    if (row.item_url) {
                        failedUrlsContent += `${timestamp},"${row.item_url}","${row.reason_code}: ${row.reason_detail}"\n`;
                    }
                }
                if (failedUrlsContent) {
                    await fs.appendFile(path.join(executionDir, 'failed_urls.csv'), failedUrlsContent);
                }
            }

            return { converted: tsvRows.length, failed: failedRows.length, failedNoId: noProductIdCount };

        } catch (e) {
            console.error('Conversion failed', e);
            return { converted: 0, failed: 0, failedNoId: 0 };
        }
    }
}
