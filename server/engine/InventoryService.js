const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const WATCH_ITEMS_PATH = path.join(__dirname, '../data/watch_items.json');

class InventoryService {
    static getWatchItems() {
        if (!fs.existsSync(WATCH_ITEMS_PATH)) {
            return [];
        }
        try {
            const raw = fs.readFileSync(WATCH_ITEMS_PATH, 'utf8');
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse watch_items.json', e);
            return [];
        }
    }

    static saveWatchItems(items) {
        fs.mkdirSync(path.dirname(WATCH_ITEMS_PATH), { recursive: true });
        fs.writeFileSync(WATCH_ITEMS_PATH, JSON.stringify(items, null, 2), 'utf8');
    }

    static extractMercariItemId(url) {
        if (!url) return null;
        // Matches https://jp.mercari.com/item/m12345678910 etc.
        const match = url.match(/\/item\/(m\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    }

    static addWatchItem(data) {
        const { amazon_sku, amazon_asin, amazon_title, mercari_url } = data;
        
        // 1. Validation
        if (!amazon_sku || !amazon_sku.trim()) throw new Error('SKU is required');
        if (!amazon_asin || !amazon_asin.trim()) throw new Error('ASIN is required');
        if (!amazon_title || !amazon_title.trim()) throw new Error('Title is required');
        if (!mercari_url || !mercari_url.trim()) throw new Error('Mercari URL is required');

        const mercari_item_id = this.extractMercariItemId(mercari_url);
        if (!mercari_item_id) {
            throw new Error('Invalid Mercari URL format. Could not extract item ID (m...).');
        }

        const items = this.getWatchItems();

        // 2. Duplicate Check
        const isDuplicate = items.some(i => i.mercari_item_id === mercari_item_id || i.mercari_url === mercari_url);
        if (isDuplicate) {
            throw new Error('This Mercari item is already being watched.');
        }

        // 3. Add to list
        const now = new Date().toISOString();
        const newItem = {
            watch_id: randomUUID(),
            amazon_sku: amazon_sku.trim(),
            amazon_asin: amazon_asin.trim(),
            amazon_title: amazon_title.trim(),
            mercari_item_id,
            mercari_url: mercari_url.trim(),
            last_known_status: 'unknown',
            last_known_price: null,
            last_checked_at: null,
            alert_level: 'normal',
            alert_reason: 'none',
            created_at: now,
            updated_at: now
        };

        items.push(newItem);
        this.saveWatchItems(items);
        return newItem;
    }

    static updateWatchItem(watch_id, updates) {
        const items = this.getWatchItems();
        const idx = items.findIndex(i => i.watch_id === watch_id);
        if (idx === -1) return null;

        items[idx] = {
            ...items[idx],
            ...updates,
            updated_at: new Date().toISOString()
        };
        this.saveWatchItems(items);
        return items[idx];
    }

    static async checkItems(watchIds = []) {
        const items = this.getWatchItems();
        const targetItems = watchIds.length > 0 
            ? items.filter(i => watchIds.includes(i.watch_id))
            : items;
            
        if (targetItems.length === 0) return [];

        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) width/1920 height/1080',
            locale: 'ja-JP'
        });
        
        const results = [];
        
        try {
            for (const item of targetItems) {
                const page = await context.newPage();
                let alert_level = 'normal';
                let alert_reason = 'none';
                let last_known_status = item.last_known_status || 'unknown';
                let last_known_price = item.last_known_price;
                
                try {
                    console.log(`[WATCH] CHECK watch_id=${item.watch_id} url=${item.mercari_url}`);
                    const response = await page.goto(item.mercari_url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    
                    if (!response || response.status() === 404) {
                        alert_level = 'danger';
                        alert_reason = 'deleted_detected';
                        last_known_status = 'deleted';
                        console.log(`[WATCH] DELETED watch_id=${item.watch_id}`);
                    } else {
                        // Check if sold
                        const soldByAria = await page.$('[aria-label="売り切れ"]').then(el => !!el).catch(() => false);
                        const soldByClass = await page.$('.item-sold-out-overlay, [data-testid="chest-sold-out"]').then(el => !!el).catch(() => false);
                        
                        if (soldByAria || soldByClass) {
                            alert_level = 'danger';
                            alert_reason = 'sold_detected';
                            last_known_status = 'sold';
                            console.log(`[WATCH] SOLD watch_id=${item.watch_id}`);
                        } else {
                            last_known_status = 'active';
                            
                            // Check price
                            const priceText = await page.evaluate(() => {
                                const el = document.querySelector('[data-testid="price"]');
                                return el ? el.innerText : null;
                            }).catch(() => null);
                            
                            if (priceText) {
                                const currentPrice = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
                                if (!isNaN(currentPrice)) {
                                    if (last_known_price !== null && currentPrice !== last_known_price) {
                                        alert_level = 'warning';
                                        alert_reason = 'price_changed';
                                        console.log(`[WATCH] PRICE_CHANGED watch_id=${item.watch_id} old=${last_known_price} new=${currentPrice}`);
                                    }
                                    last_known_price = currentPrice;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[WATCH] failed to check watch_id=${item.watch_id}`, e);
                    alert_level = 'warning';
                    alert_reason = 'check_failed';
                } finally {
                    await page.close();
                }
                
                // Update item
                const u = this.updateWatchItem(item.watch_id, {
                    last_known_status,
                    last_known_price,
                    alert_level,
                    alert_reason,
                    last_checked_at: new Date().toISOString()
                });
                if (u) results.push(u);
            }
        } finally {
            await browser.close().catch(() => {});
        }
        
        return results;
    }
}

module.exports = { InventoryService };
