const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

async function debug() {
    const executionDir = process.env.RUN_DIR;
    const mappingPath = path.join(executionDir, 'mapping.csv');
    console.log(`Reading: ${mappingPath}`);

    try {
        const mappingContent = fs.readFileSync(mappingPath, 'utf8');
        console.log('--- Content Start ---');
        console.log(mappingContent.slice(0, 100));
        console.log('--- Content End ---');

        const mapRecords = parse(mappingContent, {
            columns: true,
            bom: true,
            skip_empty_lines: true,
            relax_column_count: true
        });

        console.log('Parsed Records:', mapRecords);

        const mapping = new Map();
        for (const row of mapRecords) {
            if (row.item_id && row.amazon_product_id) {
                console.log(`Mapping found: ${row.item_id} -> ${row.amazon_product_id}`);
                mapping.set(row.item_id, {
                    id: row.amazon_product_id,
                    type: row.amazon_product_id_type || 'ASIN'
                });
            } else {
                console.log('Row skipped:', row);
            }
        }
        console.log(`Map Size: ${mapping.size}`);

    } catch (e) {
        console.error(e);
    }
}

debug();
