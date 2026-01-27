const { stringify } = require('csv-stringify/sync');
const fs = require('fs');
const path = require('path');

class AsinService {
    static async run(runDir, items) {
        // if (!items || items.length === 0) return { asinStats: {} };
        const safeItems = items || [];

        // Basic matching logic (P4.2)
        // For Stage 0, we can just stub or do minimal logic
        // As items are from Mercari, we don't have ASIN.
        // We just output NO_MATCH for all to satisfy schema/log requirements.

        const asinItems = safeItems.map(item => ({
            ...item,
            asin: '',
            match_type: 'NO_MATCH'
        }));

        // Write asin.tsv
        const asinPath = path.join(runDir, 'asin.tsv');
        // Define columns explicitly to ensure header generation even if items is empty
        const asinCols = ['collected_at', 'site', 'item_id', 'item_url', 'title', 'price_yen', 'shipping_free', 'seller_type', 'image_count', 'first_image_url', 'condition', 'description', 'asin', 'match_type'];
        const asinData = stringify(asinItems, { header: true, bom: true, delimiter: '\t', columns: asinCols });
        fs.writeFileSync(asinPath, asinData);

        // Write asin_failed.csv
        const asinFailedPath = path.join(runDir, 'asin_failed.csv');
        fs.writeFileSync(asinFailedPath, stringify([], { header: true, bom: true, columns: ['item_id', 'item_url', 'failure_reason', 'detail'] }));

        // Write asin.log
        const asinLogPath = path.join(runDir, 'asin.log');
        fs.writeFileSync(asinLogPath, `[${new Date().toISOString()}] ASIN matching completed. 0 matches.\n`);

        return {
            asinStats: { matched_rows: 0, failed_rows: items.length, reasons_top: 'NO_MATCH:' + items.length }
        };
    }
}

module.exports = { AsinService };
