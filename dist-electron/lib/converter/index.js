"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonConverter = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("csv-parse/sync");
const sync_2 = require("csv-stringify/sync");
const runUtils_1 = require("../runUtils");
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
class AmazonConverter {
    static async convert(executionDir, config) {
        try {
            // ... (Mapping Load logic remains same, skipping for brevity in thought, but must implement full) ...
            // I'll reuse the existing mapping load logic by reading file or just assume it is there.
            // Wait, I need to replace the WHOLE file content. 
            // I will copy the mapping logic from previous `view_file` output.
            // [MAPPING LOAD]
            const mappingPath = (0, runUtils_1.getGlobalMappingPath)();
            const runLogPath = path_1.default.join(executionDir, 'run.log');
            let mapping = new Map();
            const appendLog = async (msg) => {
                const line = `[${new Date().toISOString()}] ${msg}\n`;
                await promises_1.default.appendFile(runLogPath, line).catch(() => { });
            };
            await appendLog(`[CONVERT] START run_dir=${executionDir}`);
            try {
                // Check file existence via stat implicitly or explicitly
                await promises_1.default.stat(mappingPath);
                const mappingContent = await promises_1.default.readFile(mappingPath, 'utf8');
                const mapRecords = (0, sync_1.parse)(mappingContent, {
                    columns: true,
                    bom: true,
                    skip_empty_lines: true,
                    relax_column_count: true
                });
                for (const row of mapRecords) {
                    if (row.item_id && row.amazon_product_id) {
                        mapping.set(row.item_id, {
                            id: row.amazon_product_id,
                            type: row.amazon_product_id_type || 'ASIN'
                        });
                    }
                }
                await appendLog(`[CONVERT] Loaded ${mapping.size} mappings`);
            }
            catch (e) {
                if (e.code !== 'ENOENT')
                    await appendLog(`[CONVERT] Mapping Error: ${e.message}`);
            }
            const rawPath = path_1.default.join(executionDir, 'raw.csv');
            if (!(await promises_1.default.stat(rawPath).catch(() => false))) {
                return { converted: 0, failed: 0, failedNoId: 0, error: 'Raw data not found' };
            }
            const rawContent = await promises_1.default.readFile(rawPath, 'utf8');
            const records = (0, sync_1.parse)(rawContent, { columns: true, bom: true });
            const tsvRows = [];
            const failedRows = [];
            const reportRows = [];
            let noProductIdCount = 0;
            for (const item of records) {
                const report = { item_id: item.item_id, status: 'SUCCESS', message: '' };
                if (!item.item_id)
                    continue;
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
                    `MF-${item.item_id}`, // sku
                    item.amazon_product_id, // product-id
                    item.amazon_product_id_type || 'ASIN', // product-id-type
                    item.price_yen, // price
                    '', // min-price
                    '', // max-price
                    '11', // item-condition (11=Used Good)
                    1, // quantity
                    'a', // add-delete (a=add)
                    '', // will-ship
                    '', // expedited
                    '', // standard-plus
                    '中古品です。', // item-note
                    '', // fulfillment-id
                    '', // tax-code
                    '2', // leadtime (days)
                    '' // merchant_shipping_group
                ]);
                reportRows.push(report);
            }
            // [REQ 2] 0 Rows Check
            const tsvPath = path_1.default.join(executionDir, 'amazon_upload.tsv');
            if (tsvRows.length === 0) {
                await appendLog('[CONVERT] 0 valid rows generated. Skipping TSV creation.');
                // Ensure we remove old TSV if exists to avoid confusion
                await promises_1.default.unlink(tsvPath).catch(() => { });
                // Write failed report
                if (failedRows.length > 0) {
                    const failedOutput = (0, sync_2.stringify)(failedRows, { header: true });
                    await promises_1.default.writeFile(path_1.default.join(executionDir, 'amazon_convert_failed.csv'), '\ufeff' + failedOutput);
                }
                return { converted: 0, failed: failedRows.length, failedNoId: noProductIdCount, error: 'No valid items to export (Check mappings)' };
            }
            // Write TSV
            const tsvOutput = (0, sync_2.stringify)(tsvRows, { header: true, columns: AMAZON_HEADER, delimiter: '\t' });
            await promises_1.default.writeFile(tsvPath, '\ufeff' + tsvOutput);
            // Write Failed
            if (failedRows.length > 0) {
                const failedOutput = (0, sync_2.stringify)(failedRows, { header: true });
                await promises_1.default.writeFile(path_1.default.join(executionDir, 'amazon_convert_failed.csv'), '\ufeff' + failedOutput);
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
                if (item.amazon_product_id)
                    mappedCount++;
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
        }
        catch (e) {
            console.error('Conversion failed', e);
            return { converted: 0, failed: 0, failedNoId: 0, error: e.message };
        }
    }
}
exports.AmazonConverter = AmazonConverter;
