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
            failure_count: 0,
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
        let targetItems = watchIds.length > 0 
            ? items.filter(i => watchIds.includes(i.watch_id))
            : items;
            
        // 差分チェック導入: check_failed でない && 15分以内ならスキップ
        const nowMs = Date.now();
        const MIN_INTERVAL = 15 * 60 * 1000; 
        targetItems = targetItems.filter(i => {
            if (i.alert_reason === 'check_failed') return true; // Retry heavily
            if (!i.last_checked_at) return true;
            const diff = nowMs - new Date(i.last_checked_at).getTime();
            if (diff < MIN_INTERVAL && watchIds.length === 0) {
                console.log(`[WATCH] SKIP watch_id=${i.watch_id} (checked ${Math.round(diff/60000)}m ago)`);
                return false; 
            }
            return true;
        });

        if (targetItems.length === 0) return [];

        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
                let failure_count = item.failure_count || 0;
                
                try {
                    console.log(`[WATCH] CHECK watch_id=${item.watch_id} url=${item.mercari_url}`);
                    const response = await page.goto(item.mercari_url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    
                    if (!response || response.status() === 404) {
                        alert_level = 'danger';
                        alert_reason = 'deleted_detected';
                        last_known_status = 'deleted';
                        failure_count = 0;
                        console.log(`[WATCH] DELETED watch_id=${item.watch_id} (HTTP 404)`);
                    } else {
                        // 1. Check if the page actually contains an item (detect silent 404 / redirect)
                        const hasTitle = await page.$('[data-testid="item-name"]').then(el => !!el).catch(() => false);
                        
                        if (!hasTitle) {
                            alert_level = 'danger';
                            alert_reason = 'deleted_detected';
                            last_known_status = 'deleted';
                            failure_count = 0;
                            console.log(`[WATCH] DELETED watch_id=${item.watch_id} (No item title found in DOM)`);
                        } else {
                            // 2. Check if sold (3つのうち2つ以上で確定)
                            const soldConditions = await page.evaluate(() => {
                                let cond1 = false; // バッジ
                                let cond2 = false; // 購入ボタン無し (存在すればfalse, なければtrue... ではなく、明示的な売り切れか)
                                let cond3 = false; // 売り切れ文言
                                
                                if (document.querySelector('[aria-label="売り切れ"]') || document.querySelector('.item-sold-out-overlay') || document.querySelector('[data-testid="chest-sold-out"]')) cond1 = true;
                                
                                // 購入ボタンが無く、かつ売り切れボタン等がある場合
                                const textContent = document.body.innerText;
                                if (!textContent.includes('購入手続きへ') && textContent.includes('売り切れ')) cond2 = true;
                                
                                // ボタン自体に売り切れと書いてあるか
                                const buttons = Array.from(document.querySelectorAll('mer-button, button'));
                                if (buttons.some(b => b.textContent && b.textContent.includes('売り切れ'))) cond3 = true;
                                
                                return (cond1 ? 1 : 0) + (cond2 ? 1 : 0) + (cond3 ? 1 : 0);
                            }).catch(() => 0);
                            
                            // 2条件以上で確定
                            if (soldConditions >= 2) {
                                alert_level = 'danger';
                                alert_reason = 'sold_detected';
                                last_known_status = 'sold';
                                failure_count = 0;
                                console.log(`[WATCH] SOLD watch_id=${item.watch_id} (Score: ${soldConditions}/3)`);
                            } else {
                                last_known_status = 'active';
                                failure_count = 0;
                                
                                // 3. Check price
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
                    }
                } catch (e) {
                    // Timeout / Navigation Error -> check_failed
                    failure_count++;
                    alert_level = failure_count >= 2 ? 'danger' : 'warning';
                    alert_reason = 'check_failed';
                    console.error(`[WATCH] CHECK_FAILED watch_id=${item.watch_id} failures=${failure_count}`, e.message);
                } finally {
                    await page.close();
                }
                
                // Update item
                const u = this.updateWatchItem(item.watch_id, {
                    last_known_status,
                    last_known_price,
                    alert_level,
                    alert_reason,
                    failure_count,
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
