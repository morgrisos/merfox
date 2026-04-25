import type { NextApiRequest, NextApiResponse } from 'next';
import { withLicense } from '@/lib/license/serverLicenseCheck';

export interface AsinCandidate {
    asin: string;
    title: string;
    price?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({ error: 'Missing query parameter q' });
    }

    const keyword = q.trim();
    console.log('[AMAZON_SEARCH_GENERATED] keyword=', keyword);

    try {
        const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&language=ja_JP`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
            console.warn('[AMAZON_SEARCH] Amazon returned', response.status);
            return res.status(200).json({ candidates: [], error: `Amazon returned ${response.status}` });
        }

        const html = await response.text();

        // Extract data-asin + adjacent title from search results
        const candidates: AsinCandidate[] = [];
        const seen = new Set<string>();

        // Match product blocks: data-asin="B0XXXXXXXX" (10-char uppercase+digits, no B00 filter)
        const blockRegex = /data-asin="([A-Z0-9]{10})"/g;
        let match: RegExpExecArray | null;

        while ((match = blockRegex.exec(html)) !== null && candidates.length < 3) {
            const asin = match[1];
            if (seen.has(asin) || asin === '0000000000') continue;
            seen.add(asin);

            // Extract title near this ASIN in the HTML slice (+2000 chars forward)
            const slice = html.slice(match.index, match.index + 2000);
            let title = '';

            // Try a-size-base-plus (most common product title class in JP Amazon)
            const titleMatch =
                /class="[^"]*a-size-base-plus[^"]*"[^>]*>([^<]{5,120})</.exec(slice) ||
                /class="[^"]*a-text-normal[^"]*"[^>]*>([^<]{5,120})</.exec(slice) ||
                /class="[^"]*a-size-medium[^"]*"[^>]*>([^<]{5,120})</.exec(slice);

            if (titleMatch) {
                title = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            }

            // Extract price if available
            const priceMatch = /class="[^"]*a-price-whole[^"]*"[^>]*>([0-9,]+)</.exec(slice);
            const price = priceMatch ? `¥${priceMatch[1]}` : undefined;

            candidates.push({ asin, title: title || asin, price });
        }

        console.log('[AMAZON_SEARCH_GENERATED] results=', candidates.length, 'for keyword=', keyword);
        return res.status(200).json({ candidates });

    } catch (e: any) {
        console.error('[AMAZON_SEARCH_ERROR]', e.message);
        return res.status(200).json({ candidates: [], error: e.message });
    }
}

export default withLicense(handler);
