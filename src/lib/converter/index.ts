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
            // [L2-3] Load listing_config.json — fallback to hardcoded defaults if missing
            const listingConfigPath = path.join(executionDir, 'listing_config.json');
            let listingConfig = {
                amazon: {
                    item_condition: '11',       // 中古-良 (backward compat default)
                    leadtime_to_ship: '2',
                    item_note: '中古品です。',
                },
            };
            try {
                const raw = await fs.readFile(listingConfigPath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed?.amazon) {
                    listingConfig.amazon.item_condition = parsed.amazon.item_condition ?? listingConfig.amazon.item_condition;
                    listingConfig.amazon.leadtime_to_ship = parsed.amazon.leadtime_to_ship ?? listingConfig.amazon.leadtime_to_ship;
                    listingConfig.amazon.item_note = parsed.amazon.item_note ?? listingConfig.amazon.item_note;
                }
            } catch {
                // File absent or malformed — use defaults above (backward compatible)
            }

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

                // [P1-①] SOLD guard — pattern array covers Mercari 表記ゆれ
                const condNorm = String(item.condition ?? '').toLowerCase().trim();
                const SOLD_PATTERNS = [
                    'sold', 'sold out', 'sold_out', 'soldout',
                    '売り切れ', '売切れ', '売り切れ！',
                ];
                if (SOLD_PATTERNS.some(p => condNorm.includes(p))) {
                    report.status = 'SKIPPED_SOLD';
                    report.message = `SOLD item excluded (condition=${item.condition})`;
                    reportRows.push(report);
                    await appendLog(`[CONVERT] SKIP item_id=${item.item_id} reason=SOLD condition=${item.condition}`);
                    continue;
                }

                // [P0-3] price_yen <= 0 guard
                const priceNum = Number(item.price_yen);
                if (!item.price_yen || isNaN(priceNum) || priceNum <= 0) {
                    report.status = 'SKIPPED_PRICE_INVALID';
                    report.message = `Invalid/zero price (price_yen=${item.price_yen})`;
                    reportRows.push(report);
                    await appendLog(`[CONVERT] SKIP item_id=${item.item_id} reason=PRICE_INVALID price=${item.price_yen}`);
                    continue;
                }

                // maxPrice filter (existing)
                if (priceNum > (config.maxPrice || 100000)) {
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

                // [REQ 1] No Product ID
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

                // [P0-3] leadtime clamp 1–30 (final guard)
                const rawLeadtime = parseInt(listingConfig.amazon.leadtime_to_ship, 10);
                const safeLeadtime = isNaN(rawLeadtime)
                    ? '2'
                    : String(Math.max(1, Math.min(30, rawLeadtime)));
                if (safeLeadtime !== listingConfig.amazon.leadtime_to_ship) {
                    await appendLog(`[CONVERT] leadtime clamped ${listingConfig.amazon.leadtime_to_ship} → ${safeLeadtime}`);
                }

                // [P1-③] Shipping method guard
                const methodStr = String(item.shipping_method_text ?? '');
                const NG_SHIPPING_METHODS = ['たのメル', '着払い', '直接引き取り', '手渡し'];
                if (NG_SHIPPING_METHODS.some(ng => methodStr.includes(ng))) {
                    report.status = 'SKIPPED_SHIPPING_METHOD';
                    report.message = `NG Shipping Method (${methodStr})`;
                    reportRows.push(report);
                    await appendLog(`[CONVERT] SKIP item_id=${item.item_id} reason=SHIPPING_METHOD method="${methodStr}"`);
                    continue;
                }

                // [P1-③] Shipping days delay guard
                let maxMercariDays = 0;
                const daysStr = String(item.shipping_days_text ?? '');
                const daysMatch = daysStr.match(/\d+/g);
                if (daysMatch) {
                    maxMercariDays = Math.max(...daysMatch.map(Number));
                } else {
                    report.status = 'SKIPPED_SHIPPING_DAYS_UNKNOWN';
                    report.message = `Cannot parse shipping days (${daysStr})`;
                    reportRows.push(report);
                    await appendLog(`[CONVERT] SKIP item_id=${item.item_id} reason=SHIPPING_DAYS_UNKNOWN text="${daysStr}"`);
                    continue;
                }
                const configuredDays = parseInt(safeLeadtime, 10);
                // If the item takes more days to ship than what we've committed to Amazon, it's a guaranteed late shipment.
                if (maxMercariDays > configuredDays) {
                    report.status = 'SKIPPED_SHIPPING_DELAY';
                    report.message = `Mercari days (${maxMercariDays}) > Amazon setting (${configuredDays})`;
                    reportRows.push(report);
                    await appendLog(`[CONVERT] SKIP item_id=${item.item_id} reason=SHIPPING_DELAY mercari_days=${maxMercariDays} amazon_setting=${configuredDays} text="${daysStr}"`);
                    continue;
                }

                // [P0-3] item_note final 256-char trim + strip newlines/tabs (TSV safety)
                const safeNote = listingConfig.amazon.item_note
                    .replace(/[\r\n\t]+/g, ' ')
                    .trim()
                    .slice(0, 256);

                // [P1-③] Condition Auto Mapping
                const cond = String(item.condition ?? '').trim();
                let amazonCondition = listingConfig.amazon.item_condition;
                const mode = listingConfig.amazon.condition_mapping_mode === 'conservative' ? 'conservative' : 'normal';

                if (!cond) {
                    await appendLog(`[CONVERT] WARN condition_missing_or_unknown item_id=${item.item_id} condition="${cond}" fallback=item-condition=${amazonCondition}`);
                } else if (cond === '新品、未使用') {
                    amazonCondition = '11';
                    await appendLog(`[CONVERT] MAP item_id=${item.item_id} condition="${cond}" -> item-condition=${amazonCondition} mode=${mode}`);
                } else if (cond === '未使用に近い') {
                    amazonCondition = mode === 'conservative' ? '10' : '11';
                    await appendLog(`[CONVERT] MAP item_id=${item.item_id} condition="${cond}" -> item-condition=${amazonCondition} mode=${mode}`);
                } else if (cond === '目立った傷や汚れなし') {
                    amazonCondition = '10';
                    await appendLog(`[CONVERT] MAP item_id=${item.item_id} condition="${cond}" -> item-condition=${amazonCondition} mode=${mode}`);
                } else if (cond === 'やや傷や汚れあり') {
                    amazonCondition = '9';
                    await appendLog(`[CONVERT] MAP item_id=${item.item_id} condition="${cond}" -> item-condition=${amazonCondition} mode=${mode}`);
                } else if (cond === '傷や汚れあり') {
                    amazonCondition = '9';
                    await appendLog(`[CONVERT] MAP item_id=${item.item_id} condition="${cond}" -> item-condition=${amazonCondition} mode=${mode}`);
                } else if (cond === '全体的に状態が悪い') {
                    report.status = 'SKIPPED_CONDITION_TOO_BAD';
                    report.message = `Condition extremely bad (${cond})`;
                    reportRows.push(report);
                    await appendLog(`[CONVERT] SKIP item_id=${item.item_id} reason=CONDITION_TOO_BAD condition="${cond}"`);
                    continue;
                } else {
                    await appendLog(`[CONVERT] WARN condition_missing_or_unknown item_id=${item.item_id} condition="${cond}" fallback=item-condition=${amazonCondition}`);
                }

                // Construct Row — values from listing_config.json (fallback: old hardcoded defaults)
                tsvRows.push([
                    `MF-${item.item_id}`,              // sku
                    item.amazon_product_id,            // product-id
                    item.amazon_product_id_type || 'ASIN', // product-id-type
                    item.price_yen,                    // price
                    '',                                // min-price
                    '',                                // max-price
                    amazonCondition,                   // item-condition [P1-3 mapped]
                    1,                                 // quantity
                    'a',                               // add-delete (a=add)
                    '',                                // will-ship
                    '',                                // expedited
                    '',                                // standard-plus
                    safeNote,                          // item-note [P0-2 trimmed]
                    '',                                // fulfillment-id
                    '',                                // tax-code
                    safeLeadtime,                      // leadtime [P0-3 clamped]
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

            // [P1-②] TSV spot-check: read back first data row and log 3 key values
            try {
                const tsvCheck = await fs.readFile(tsvPath, 'utf8');
                const tsvLines = tsvCheck.replace(/^\uFEFF/, '').split('\n');
                if (tsvLines.length < 2 || !tsvLines[1].trim()) {
                    await appendLog('[CONVERT] TSV_CHECK skipped (0 rows)');
                } else {
                    const headers = tsvLines[0].split('\t');
                    const vals = tsvLines[1].split('\t');
                    const get = (h: string) => vals[headers.indexOf(h)] ?? '';
                    const noteVal = get('item-note');
                    await appendLog(
                        `[CONVERT] TSV_CHECK item-condition=${get('item-condition')}` +
                        ` leadtime-to-ship=${get('leadtime-to-ship')}` +
                        ` item-note-len=${noteVal.length}` +
                        (noteVal.length > 0 ? ` item-note-prefix="${noteVal.slice(0, 20)}"` : '')
                    );
                }
            } catch (e) {
                await appendLog(`[CONVERT] TSV_CHECK error: ${e}`);
            }

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

            const s = reportRows.reduce((acc, r) => {
                const k = r.status.toLowerCase();
                acc[k] = (acc[k] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const failedRow = s['failed'] || 0;
            const skip_sold = s['skipped_sold'] || 0;
            const skip_price = s['skipped_price'] || 0;
            const skip_method = s['skipped_shipping_method'] || 0;
            const skip_delay = s['skipped_shipping_delay'] || 0;
            const skip_days_unknown = s['skipped_shipping_days_unknown'] || 0;
            const skip_condition_bad = s['skipped_condition_too_bad'] || 0;

            await appendLog(`[CONVERT] SUMMARY total=${candidateCount} mapped=${mappedCount} valid=${validCount} skip_sold=${skip_sold} skip_price=${skip_price} skip_method=${skip_method} skip_delay=${skip_delay} skip_days_unknown=${skip_days_unknown} skip_condition_bad=${skip_condition_bad} failed=${failedRow}`);

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
