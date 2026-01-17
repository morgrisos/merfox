import { NextResponse } from 'next/server';
import { scraperManager } from '@/lib/manager';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { runId, targetUrl, config, mode } = body;

        if (!targetUrl) {
            return NextResponse.json({ error: 'Missing targetUrl' }, { status: 400 });
        }

        console.log(`[API] Starting run ${runId} for ${targetUrl} (${mode})`);

        // Start Scraper
        await scraperManager.start({
            runId: runId || crypto.randomUUID(),
            url: targetUrl,
            mode: mode || 'onetime',
            countLimit: config?.maxItems || 50, // default limit
            excludeShops: config?.excludeShops,
            ngWords: config?.excludeKeywords ? config.excludeKeywords.split(',') : [],
            outputDir: process.env.MERFOX_RUNS_DIR || '', // Let manager resolve default
            excludeUnknown: true,
            excludeShippingPaid: false,
            ngRegex: []
        });

        return NextResponse.json({ success: true, runId });
    } catch (e: any) {
        console.error('[API] Failed to start run:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
