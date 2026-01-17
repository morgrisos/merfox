import { NextResponse } from 'next/server';
import { scraperManager } from '@/lib/manager';

export async function POST() {
    try {
        await scraperManager.stop();
        console.log('[API] Stop requested');
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
