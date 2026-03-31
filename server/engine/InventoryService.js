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
        let items = this.getWatchItems();
        let targetItems = watchIds.length > 0 
            ? items.filter(i => watchIds.includes(i.watch_id))
            : items;

        if (targetItems.length === 0) return [];

        const nowMs = Date.now();
        const MIN_INTERVAL = 15 * 60 * 1000; 
        
        targetItems = targetItems.filter(i => {
            if (i.alert_reason === 'check_failed') return true; 
            if (!i.last_checked_at) return true;
            const diff = nowMs - new Date(i.last_checked_at).getTime();
            if (diff < MIN_INTERVAL && watchIds.length === 0) {
                console.log(`[WATCH] SKIP watch_id=${i.watch_id} (checked ${Math.floor(diff/60000)}m ago)`);
                return false;
            }
            return true;
        });

        if (targetItems.length === 0) return [];

        const { chromium } = require('playwright');
        const os = require('os');
        const path = require('path');
        const userDataDir = path.join(os.homedir(), '.merfox_watch_profile');
        
        let browserContext;
        const results = [];
        
        try {
            browserContext = await chromium.launchPersistentContext(userDataDir, {
                headless: false,
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 800 },
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars'
                ]
            });
            
            const page = await browserContext.newPage();
            
            // Stealth injections
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'languages', { get: () => ['ja', 'en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            });

            for (const item of targetItems) {
                console.log(`[WATCH] CHECK watch_id=${item.watch_id} url=${item.mercari_url}`);
                
                let last_known_status = item.last_known_status || 'unknown';
                let alert_level = item.alert_level || 'normal';
                let alert_reason = item.alert_reason || 'none';
                let failure_count = item.failure_count || 0;
                let last_known_price = item.last_known_price;
                
                // Retry loop: max 3 attempts
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const response = await page.goto(item.mercari_url, { waitUntil: 'domcontentloaded', timeout: 8000 });
                        
                        await page.waitForTimeout(1000); // 描画待ち
                        
                        const isDeletedText = await page.evaluate(() => {
                            const txt = document.body.innerText;
                            return txt.includes('ページが見つかりません') || txt.includes('削除') || txt.includes('エラーが発生');
                        }).catch(() => false);
                        
                        const titleEl = await page.waitForSelector('h1[data-testid="item-name"], h1', { timeout: 3000 }).catch(() => null);
                        const hasTitle = !!titleEl;
                        
                        const hasSkeleton = await page.evaluate(() => {
                            return !!document.querySelector('mer-skeleton') || !!document.querySelector('[class*="skeleton"]');
                        }).catch(() => false);

                        if (!response || response.status() === 404 || isDeletedText) {
                            alert_level = 'danger';
                            alert_reason = 'deleted_detected';
                            last_known_status = 'deleted';
                            failure_count = 0;
                            console.log(`[WATCH] DELETED watch_id=${item.watch_id} (HTTP 404 / Text Match)`);
                            break; // 成功したので抜ける
                        } else if (!hasTitle && hasSkeleton) {
                            // Skeleton detected (Bot blocked)
                            console.log(`[WATCH] SKELETON DETECTED (Attempt ${attempt}/3) watch_id=${item.watch_id}`);
                            if (attempt < 3) {
                                const waitMs = Math.floor(Math.random() * 2000) + 1000; // 1-3s random wait
                                await page.waitForTimeout(waitMs);
                                continue; // リトライ
                            } else {
                                throw new Error('Blocked by skeleton UI'); // catchへ
                            }
                        } else if (!hasTitle) {
                            alert_level = 'danger';
                            alert_reason = 'deleted_detected';
                            last_known_status = 'deleted';
                            failure_count = 0;
                            console.log(`[WATCH] DELETED watch_id=${item.watch_id} (No item title found in DOM)`);
                            break;
                        } else {
                            // Active or Sold
                            const soldConditions = await page.evaluate(() => {
                                let cond1 = false; 
                                let cond2 = false; 
                                let cond3 = false; 
                                
                                if (document.querySelector('[aria-label="売り切れ"]') || document.querySelector('.item-sold-out-overlay') || document.querySelector('[data-testid="chest-sold-out"]')) cond1 = true;
                                
                                const textContent = document.body.innerText;
                                if (!textContent.includes('購入手続きへ') && textContent.includes('売り切れ')) cond2 = true;
                                
                                const buttons = Array.from(document.querySelectorAll('mer-button, button'));
                                if (buttons.some(b => b.textContent && b.textContent.includes('売り切れ'))) cond3 = true;
                                
                                return (cond1 ? 1 : 0) + (cond2 ? 1 : 0) + (cond3 ? 1 : 0);
                            }).catch(() => 0);
                            
                            if (soldConditions >= 2) {
                                alert_level = 'danger';
                                alert_reason = 'sold_detected';
                                last_known_status = 'sold';
                                failure_count = 0;
                                console.log(`[WATCH] SOLD watch_id=${item.watch_id} (Score: ${soldConditions}/3)`);
                                break;
                            } else {
                                last_known_status = 'active';
                                failure_count = 0;
                                
                                const priceText = await page.evaluate(() => {
                                    let el = document.querySelector('[data-testid="price"]');
                                    if (el) return el.innerText;
                                    el = document.querySelector('mer-price');
                                    if (el) return el.innerText;
                                    // Fallback: search for something starting with ¥ near h1
                                    const h1 = document.querySelector('h1');
                                    if (h1 && h1.nextElementSibling) {
                                        const match = h1.parentElement.innerText.match(/¥\s*([0-9,]+)/);
                                        if (match) return match[1];
                                    }
                                    return null;
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
                                break;
                            }
                        }
                    } catch (error) {
                        console.log(`[WATCH] Error on attempt ${attempt}: ${error.message}`);
                        if (attempt < 3) {
                            const waitMs = Math.floor(Math.random() * 2000) + 1000;
                            await page.waitForTimeout(waitMs);
                        } else {
                            // 最終的なタイムアウトやエラー
                            failure_count++;
                            alert_level = failure_count >= 2 ? 'danger' : 'warning';
                            alert_reason = 'check_failed';
                            last_known_status = 'unknown';
                            console.error(`[WATCH] CHECK_FAILED watch_id=${item.watch_id} failures=${failure_count}`);
                        }
                    }
                } // end retry loop

                // Update item states
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
            if (browserContext) {
                await browserContext.close().catch(() => {});
            }
        }
        
        return results;
    }
}

module.exports = { InventoryService };
