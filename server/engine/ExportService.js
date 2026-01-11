const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

class ExportService {
    static async run(runDir, items, options = {}) {
        // if (!items || items.length === 0) return { profitStats: {}, exportStats: {} }; // Removed to allow empty files
        const safeItems = items || [];

        // 1. Profit Calculation (P4.1)
        const profitItems = safeItems.map(item => {
            const sell = item.price_yen || 0;
            // Cost is default 0 for Stage 0
            const cost = options.cost_yen_default || 0;
            const profit = sell - cost; // Simplified: no fees/shipping deduction in Stage 0
            const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : '0.0';

            return {
                sku: `MF-${item.item_id}`,
                item_id: item.item_id,
                title: item.title,
                sell_price_yen: sell,
                cost_yen: cost,
                profit_yen: profit,
                margin_pct: margin,
                item_url: item.item_url,
                condition: item.condition || ''
            };
        });

        // Write profit.tsv
        const profitPath = path.join(runDir, 'profit.tsv');
        const profitCols = ['sku', 'item_id', 'title', 'sell_price_yen', 'cost_yen', 'profit_yen', 'margin_pct', 'item_url', 'condition'];
        const profitData = stringify(profitItems, { header: true, bom: true, delimiter: '\t', columns: profitCols });
        fs.writeFileSync(profitPath, profitData);

        // Write profit_failed.csv (Always empty/header only for Stage 0 as logic is simple)
        const profitFailedPath = path.join(runDir, 'profit_failed.csv');
        fs.writeFileSync(profitFailedPath, stringify([], { header: true, bom: true, columns: ['item_id', 'item_url', 'failure_reason', 'detail'] }));

        // Write profit.log
        const profitLogPath = path.join(runDir, 'profit.log');
        let logContent = `[${new Date().toISOString()}] Profit calculation completed. Rows=${profitItems.length}\n`;
        // Add minimal logs
        profitItems.slice(0, 5).forEach(p => {
            logContent += `[CALC] SKU=${p.sku} Profit=${p.profit_yen} Margin=${p.margin_pct}%\n`;
        });
        if (profitItems.length === 0) logContent += "No items to calculate.\n"; // Ensure log has content
        fs.writeFileSync(profitLogPath, logContent);


        // 2. Amazon Export (Simplified for P5 proof, maintaining schema)
        const amazonItems = items.map(item => ({
            sku: `MF-${item.item_id}`,
            product_id: item.item_id,
            product_id_type: 'Asin', // Placeholder or from matching
            price: item.price_yen,
            quantity: 1,
            condition_type: 'UsedLikeNew',
            condition_note: 'Imported item',
            handling_time: 3,
            fulfillment_channel: 'DEFAULT',
            shipping_template_name: 'Default Template'
        }));

        const amazonPath = path.join(runDir, 'amazon.tsv');
        const amazonCols = ['sku', 'product_id', 'product_id_type', 'price', 'quantity', 'condition_type', 'condition_note', 'handling_time', 'fulfillment_channel', 'shipping_template_name'];
        const amazonData = stringify(amazonItems, { header: true, bom: true, delimiter: '\t', columns: amazonCols });
        fs.writeFileSync(amazonPath, amazonData);

        // 3. Stats
        return {
            profitStats: { profit_rows: profitItems.length, failed_rows: 0, reasons_top: 'none' },
            exportStats: { tsv_rows: amazonItems.length, failed_rows: 0, reasons_top: 'none' }
        };
    }
}

module.exports = { ExportService };
