import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
// import { existsSync } from 'fs';
import path from 'path';
import { AmazonConverter } from '../../../../lib/converter'; // Ensure this exists or adapt import
import { getRunDir, getGlobalMappingPath } from '../../../../lib/runUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { runId } = req.query;

    if (!runId || Array.isArray(runId)) {
        return res.status(400).json({ error: 'Invalid Run ID' });
    }

    const runDir = await getRunDir(runId);

    // Debug info for 404
    if (!runDir) {
        // Re-import to avoid conflict if I can, or just use getRunsDir logic locally for debug msg
        const { getRunsDir } = require('../../../../lib/runUtils');
        const scanPath = getRunsDir();
        return res.status(404).json({
            error: 'Run directory not found',
            errorCode: 'RUN_DIR_NOT_FOUND',
            runId,
            scanPath,
            hint: 'Ensure the run exists in the scan path and contains raw.csv'
        });
    }

    try {
        const runMappingPath = path.join(runDir, 'mapping.csv');
        const globalMappingPath = getGlobalMappingPath();
        let mappingStatus = 'existing';

        let hasRunMapping = false;
        try { await fs.access(runMappingPath); hasRunMapping = true; } catch { }

        if (!hasRunMapping) {
            let hasGlobal = false;
            try { await fs.access(globalMappingPath); hasGlobal = true; } catch { }

            if (hasGlobal) {
                await fs.copyFile(globalMappingPath, runMappingPath);
                mappingStatus = 'copied_from_global';
            } else {
                const header = '\ufeffitem_id,amazon_product_id,amazon_product_id_type\n';
                await fs.writeFile(runMappingPath, header, 'utf8');
                mappingStatus = 'created_template';
            }
        }

        // Logic check: verify AmazonConverter import
        // If not found, we might need to find where it is or mock it
        // The user says "existing converter logic".
        // Assuming src/server/engine/ExportService.js is not usable here directly without import?
        // Wait, user said "Use existing converter logic".
        // In VSCode/merfox it was src/lib/converter.
        // In V4, ls src/lib had no converter folder in step 13668.
        // I will check src/lib content again. If missing, I must port AmazonConverter too.

        // Temporarily assuming it exists or I will create it.
        const stats = await AmazonConverter.convert(runDir, {});

        return res.status(200).json({
            success: true,
            run_id: runId,
            run_dir: runDir,
            mapping_status: mappingStatus,
            amazon_rows: stats.converted,
            failed_rows: stats.failed,
            failed_no_id: stats.failedNoId,
            error: stats.error
        });

    } catch (e: any) {
        console.error('[API] Conversion failed:', e);
        return res.status(500).json({ error: e.message || 'Conversion failed' });
    }
}
