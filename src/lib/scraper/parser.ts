import { Page } from 'puppeteer';
import { MerItem, ShopType } from '../types';

export async function parseItemPage(page: Page, url: string): Promise<Partial<MerItem> | null> {
    try {
        // Wait for critical elements
        await page.waitForSelector('h1', { timeout: 5000 });

        const data = await page.evaluate(() => {
            // Helper to get text safely
            const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || '';
            const getMeta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';

            const title = getText('h1') || getText('[data-testid="name"]');
            const priceText = getText('[data-testid="price"]') || getText('.item-price-box'); // Fallback
            const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

            const description = getText('[data-testid="description"]') || getText('.item-description-message');

            // Images: usually in a slider or grid
            // data-testid="image-0", "image-1" ...
            const images = Array.from(document.querySelectorAll('img[data-testid^="image-"]')).map(img => (img as HTMLImageElement).src);
            // Fallback for older layouts
            if (images.length === 0) {
                document.querySelectorAll('.owl-item img').forEach(img => images.push((img as HTMLImageElement).src));
            }

            // Seller Type & Shops
            // Shops items often have a specific badge or different layout
            // Look for "メルカリShops" text or specific shop link
            const isShops = !!document.querySelector('[data-testid="shop-name"]') || document.body.innerText.includes('この商品はメルカリShops');

            // Shipping
            const shippingText = getText('[data-testid="shipping-payer"]'); // "送料込み(出品者負担)"
            const shippingFree = shippingText.includes('送料込み') || shippingText.includes('出品者負担');

            // Condition
            const condition = getText('[data-testid="item-condition"]');

            return {
                title,
                price,
                description,
                images,
                isShops,
                shippingFree,
                condition
            };
        });

        // ID extraction from URL
        const idMatch = url.match(/m\d{9,}/);
        const itemId = idMatch ? idMatch[0] : '';

        if (!itemId || !data.title) return null;

        let sellerType: ShopType = 'normal';
        if (data.isShops) sellerType = 'shops';
        // Unknown logic: if we can't determine, maybe unknown. But for now default normal unless shops detected.

        return {
            item_id: itemId,
            item_url: url,
            title: data.title,
            price_yen: data.price,
            shipping_free: data.shippingFree,
            seller_type: sellerType,
            image_count: data.images.length,
            first_image_url: data.images[0] || '',
            condition: data.condition,
            description: data.description,
            collected_at: new Date().toISOString(),
            site: 'mercari'
        };

    } catch (e) {
        console.error(`Failed to parse ${url}`, e);
        return null;
    }
}
