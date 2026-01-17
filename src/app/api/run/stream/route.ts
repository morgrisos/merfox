import { NextRequest, NextResponse } from 'next/server';
import { scraperManager } from '@/lib/manager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const runId = req.nextUrl.searchParams.get('runId');

    // Create Valid Stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent('log', { message: '接続しました (Connected)', level: 'info' });

            // Poll stats every 1s
            const interval = setInterval(() => {
                const stats = scraperManager.getStats();

                // Send Progress (calc based on known total or just valid pct)
                // If maxItems is 50, and scanned is X.
                // We don't have maxItems in stats easily, assuming 50 for test or 100%.
                const pct = Math.min(100, (stats.totalScanned / 50) * 100);

                sendEvent('progress', { percentage: pct });
                sendEvent('stats', stats);

                if (stats.status === 'completed' || stats.status === 'error') {
                    sendEvent('done', {
                        success: stats.status === 'completed',
                        summary: stats,
                        error: stats.status === 'error' ? 'Stopped or Failed' : null
                    });
                    clearInterval(interval);
                    controller.close();
                }
            }, 1000);

            // Close logic handled by client disconnect usually triggers cancel?
            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
