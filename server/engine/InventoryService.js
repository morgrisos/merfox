const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

// [FIX] Store in userData so data persists across app updates.
// MERFOX_USER_DATA is set by main.ts via app.getPath('userData').
// Fallback is platform-safe for dev use (prod always has MERFOX_USER_DATA).
function getUserDataBase() {
    // [BUG-08] MERFOX_USER_DATA is already app.getPath('userData') — do NOT add 'MerFox/' subdir
    if (process.env.MERFOX_USER_DATA) return process.env.MERFOX_USER_DATA;
    // [WIN] Windows fallback (only reached in dev without env vars)
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || os.homedir(), 'MerFox');
    }
    return path.join(os.homedir(), 'Library', 'Application Support', 'merfox');
}

function getWatchItemsPath() {
    return path.join(getUserDataBase(), 'watch_items.json');
}

// [FIX] Initialize watch_items.json with empty array if it doesn't exist.
// NOTE: The old legacyPath approach using __dirname was broken in webpack-compiled
// standalone builds (__dirname resolves to the chunks dir, not server/data/).
// Removed test-data seeding to avoid polluting user data.
function initWatchItemsIfNeeded() {
    const watchPath = getWatchItemsPath();
    if (!fs.existsSync(watchPath)) {
        try {
            fs.mkdirSync(path.dirname(watchPath), { recursive: true });
            fs.writeFileSync(watchPath, '[]', 'utf8');
            console.log('[WATCH_INIT] Created empty watch_items.json at:', watchPath);
        } catch (e) {
            console.error('[WATCH_INIT] Failed to create watch_items.json:', e.message);
        }
    }
}

initWatchItemsIfNeeded();

class InventoryService {
    static getWatchItems() {
        const watchPath = getWatchItemsPath();
        console.log('[WATCH_PATH]', watchPath);
        if (!fs.existsSync(watchPath)) {
            console.log('[WATCH_LOAD] file not found, returning []');
            return [];
        }
        try {
            const raw = fs.readFileSync(watchPath, 'utf8');
            const items = JSON.parse(raw);
            console.log('[WATCH_LOAD] count=', items.length);
            return items;
        } catch (e) {
            console.error('[WATCH_LOAD] Failed to parse watch_items.json', e);
            return [];
        }
    }

    static saveWatchItems(items) {
        const watchPath = getWatchItemsPath();
        fs.mkdirSync(path.dirname(watchPath), { recursive: true });
        fs.writeFileSync(watchPath, JSON.stringify(items, null, 2), 'utf8');
        console.log('[WATCH_SAVE] count=', items.length, 'path=', watchPath);
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
        const { amazon_sku, amazon_asin, amazon_title, mercari_url, mercari_price, amazon_listing_price } = data;

        // 1. Validation
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
            amazon_sku: (amazon_sku && amazon_sku.trim()) ? amazon_sku.trim() : amazon_asin.trim(),
            amazon_asin: amazon_asin.trim(),
            amazon_title: amazon_title.trim(),
            mercari_item_id,
            mercari_url: mercari_url.trim(),
            mercari_price: typeof mercari_price === 'number' ? mercari_price : null,
            amazon_listing_price: typeof amazon_listing_price === 'number' ? amazon_listing_price : null,
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

    static async checkItems(watchIds = [], force = false) {
        const CONCURRENCY = 1;
        const DELAY_MS = 5000;
        const SKIP_STATUSES = ['sold', 'deleted'];

        let items = this.getWatchItems();
        console.log('[INV_ITEMS_LOADED]', items.length);
        console.log('[INV_FORCE_FLAG]', force, typeof force, 'watchIds_count=', watchIds.length);

        let targetItems = watchIds.length > 0
            ? items.filter(i => watchIds.includes(i.watch_id))
            : items;

        if (targetItems.length === 0) {
            console.log('[INV_ITEMS_ELIGIBLE] 0 (no items in store)');
            return { results: [], skipped_count: 0, failed_count: 0 };
        }

        // Skip already sold/deleted items
        const alreadySoldItems = targetItems.filter(i => SKIP_STATUSES.includes(i.last_known_status));
        targetItems = targetItems.filter(i => !SKIP_STATUSES.includes(i.last_known_status));
        for (const i of alreadySoldItems) {
            const reason = i.last_known_status === 'deleted' ? 'deleted_or_stopped' : 'already_sold';
            console.log(`[INV_ITEMS_SKIPPED] watch_id=${i.watch_id} asin=${i.amazon_asin} reason=${reason}`);
        }
        if (alreadySoldItems.length > 0) {
            console.log(`[INV_ITEMS_SKIPPED_TOTAL] count=${alreadySoldItems.length} (sold/deleted — skipping check)`);
        }

        const nowMs = Date.now();
        const MIN_INTERVAL = 15 * 60 * 1000;

        if (force) {
            console.log('[INV_FORCE_BYPASS] force=true — skipping interval check for all', targetItems.length, 'items');
            for (const i of targetItems) {
                const elapsed = i.last_checked_at
                    ? Math.floor((nowMs - new Date(i.last_checked_at).getTime()) / 60000)
                    : null;
                console.log(`[INV_ITEMS_ELIGIBLE] watch_id=${i.watch_id} asin=${i.amazon_asin} reason=force last_checked=${elapsed !== null ? elapsed + 'm_ago' : 'never'}`);
            }
        } else {
            console.log('[INV_MIN_INTERVAL_APPLIED] checking interval for', targetItems.length, 'items');
            const before = targetItems.length;
            targetItems = targetItems.filter(i => {
                if (i.alert_reason === 'check_failed') {
                    console.log(`[INV_ITEMS_ELIGIBLE] watch_id=${i.watch_id} asin=${i.amazon_asin} reason=check_failed_retry`);
                    return true;
                }
                if (!i.last_checked_at) {
                    console.log(`[INV_ITEMS_ELIGIBLE] watch_id=${i.watch_id} asin=${i.amazon_asin} reason=never_checked`);
                    return true;
                }
                const diff = nowMs - new Date(i.last_checked_at).getTime();
                if (diff < MIN_INTERVAL) {
                    console.log(`[INV_ITEMS_SKIPPED] watch_id=${i.watch_id} asin=${i.amazon_asin} reason=too_recent elapsed_min=${Math.floor(diff/60000)}`);
                    return false;
                }
                console.log(`[INV_ITEMS_ELIGIBLE] watch_id=${i.watch_id} asin=${i.amazon_asin} reason=interval_elapsed elapsed_min=${Math.floor(diff/60000)}`);
                return true;
            });
            const skipped = before - targetItems.length;
            console.log(`[INV_MIN_INTERVAL_RESULT] before=${before} after=${targetItems.length} skipped=${skipped}`);
        }

        console.log('[INV_ITEMS_ELIGIBLE]', targetItems.length, force ? '(force)' : '(auto)');

        if (targetItems.length === 0) {
            return { results: [], skipped_count: alreadySoldItems.length, failed_count: 0 };
        }

        const { chromium } = require('playwright');
        const os = require('os');
        const path = require('path');
        const userDataDir = path.join(os.homedir(), '.merfox_watch_profile');

        let browserContext;
        const results = [];
        console.log(`[INV_CHECK_QUEUE_START] total=${targetItems.length} concurrency=${CONCURRENCY} delay_ms=${DELAY_MS}`);

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
            
            const evidenceBase = path.join(getUserDataBase(), 'watch_evidence');
            const watchEvidenceDir = evidenceBase;
            if (!fs.existsSync(watchEvidenceDir)) {
                fs.mkdirSync(watchEvidenceDir, { recursive: true });
            }

            const processItem = async (item) => {
                let page;
                try {
                    page = await browserContext.newPage();
                    // Stealth injections
                    await page.addInitScript(() => {
                        Object.defineProperty(navigator, 'webdriver', { get: () => false });
                        Object.defineProperty(navigator, 'languages', { get: () => ['ja', 'en-US', 'en'] });
                        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                    });

                    console.log(`[WATCH] CHECK watch_id=${item.watch_id} url=${item.mercari_url}`);
                    
                    let last_known_status = item.last_known_status || 'unknown';
                    let alert_level = item.alert_level || 'normal';
                    let alert_reason = item.alert_reason || 'none';
                    let failure_count = item.failure_count || 0;
                    let last_known_price = item.last_known_price;
                    
                    let last_check_url = '';
                    let last_check_title = '';
                    let last_check_text = '';
                    let last_check_evidence = '';
                    let last_check_reason_code = '';

                    // Retry loop: max 3 attempts
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            const response = await page.goto(item.mercari_url, { waitUntil: 'domcontentloaded', timeout: 8000 });
                            
                            // 必要な要素が現れるまで待機
                            await page.waitForTimeout(1000);
                            const titleEl = await page.waitForSelector('h1[data-testid="item-name"], h1', { timeout: 3000 }).catch(() => null);
                            
                            // 価格や売り切れ表示が出るまでもう少しまつ（ここで完全な表示を担保）
                            if (titleEl) {
                                await page.waitForTimeout(1500);
                            }

                            // 証拠テキスト取得
                            last_check_url = page.url();
                            last_check_title = await page.title().catch(() => '');
                            last_check_text = await page.evaluate(() => document.body.innerText.substring(0, 1000)).catch(() => '');

                            // DOM評価
                            const hasTitle = !!titleEl;
                            const isStrictDeletedText = last_check_text.includes('ページが見つかりません');
                            const isBlockedText = last_check_text.includes('お使いのブラウザは最新ではありません') || 
                                                  last_check_text.includes('アクセス制限') || 
                                                  last_check_text.includes('商品は削除されたか');
                            
                            const hasSkeleton = await page.evaluate(() => {
                                return !!document.querySelector('mer-skeleton') || !!document.querySelector('[class*="skeleton"]');
                            }).catch(() => false);

                            const soldConditions = await page.evaluate(() => {
                                let cond1 = false; let cond2 = false; let cond3 = false; 
                                if (document.querySelector('[aria-label="売り切れ"]') || document.querySelector('.item-sold-out-overlay') || document.querySelector('[data-testid="chest-sold-out"]')) cond1 = true;
                                const textContent = document.body.innerText;
                                if (!textContent.includes('購入手続きへ') && textContent.includes('売り切れ')) cond2 = true;
                                const buttons = Array.from(document.querySelectorAll('mer-button, button'));
                                if (buttons.some(b => b.textContent && b.textContent.includes('売り切れ'))) cond3 = true;
                                return (cond1 ? 1 : 0) + (cond2 ? 1 : 0) + (cond3 ? 1 : 0);
                            }).catch(() => 0);

                            const hasPriceOrDesc = await page.evaluate(() => {
                                let price = document.querySelector('[data-testid="price"]') || document.querySelector('mer-price');
                                if (price && price.innerText) return true;
                                let desc = document.querySelector('mer-text[data-testid="description"]') || document.querySelector('[data-testid="description"]');
                                if (desc && desc.innerText && desc.innerText.length > 20) return true;
                                return false;
                            }).catch(() => false);

                            // 証拠スクリーンショット撮影 (評価が全て終わって描画が揃ったこの瞬間に撮る)
                            const evidenceTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
                            last_check_evidence = `watch_evidence/${item.watch_id}_${evidenceTimestamp}.png`;
                            const screenshotPath = path.join(watchEvidenceDir, `${item.watch_id}_${evidenceTimestamp}.png`);
                            await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => null);

                            // 最終判定ロジック
                            if (!response || response.status() === 404 || isStrictDeletedText) {
                                alert_level = 'danger';
                                alert_reason = 'deleted_404';
                                last_check_reason_code = 'deleted_404';
                                last_known_status = 'deleted';
                                failure_count = 0;
                                console.log(`[WATCH] DELETED watch_id=${item.watch_id} (HTTP 404 / Strict Text)`);
                                break; 
                            } else if (isBlockedText || (!hasTitle && hasSkeleton)) {
                                if (attempt < 3) {
                                    console.log(`[WATCH] BLOCKED/SKELETON DETECTED (Attempt ${attempt}/3) watch_id=${item.watch_id}`);
                                    const waitMs = Math.floor(Math.random() * 2000) + 1000;
                                    await page.waitForTimeout(waitMs);
                                    continue;
                                } else {
                                    alert_level = 'warning';
                                    last_known_status = 'blocked';
                                    failure_count = 0;
                                    if (last_check_text.includes('ブラウザは最新ではありません')) alert_reason = 'blocked_browser_old';
                                    else if (last_check_text.includes('アクセス制限')) alert_reason = 'blocked_access_denied';
                                    else if (!hasTitle && hasSkeleton) alert_reason = 'blocked_skeleton';
                                    else alert_reason = 'blocked_generic';
                                    last_check_reason_code = alert_reason;
                                    console.log(`[WATCH] BLOCKED watch_id=${item.watch_id} reason=${alert_reason}`);
                                    break;
                                }
                            } else if (!hasTitle) {
                                if (attempt < 3) {
                                    const waitMs = Math.floor(Math.random() * 2000) + 1000;
                                    await page.waitForTimeout(waitMs);
                                    continue;
                                }
                                alert_level = 'warning';
                                alert_reason = 'unknown_no_title';
                                last_check_reason_code = 'unknown_no_title';
                                last_known_status = 'unknown';
                                failure_count = 0;
                                console.log(`[WATCH] UNKNOWN watch_id=${item.watch_id} (No item title found)`);
                                break;
                            } else if (soldConditions >= 2 && !hasSkeleton) {
                                // SOLD 確定条件を全て満たす
                                alert_level = 'danger';
                                alert_reason = 'sold_detected';
                                last_check_reason_code = 'sold_confirmed';
                                last_known_status = 'sold';
                                failure_count = 0;
                                console.log(`[WATCH] SOLD watch_id=${item.watch_id} (Score: ${soldConditions}/3)`);
                                break;
                            } else if (hasTitle && !hasSkeleton && hasPriceOrDesc) {
                                // ACTIVE 確定条件を全て満たす
                                last_known_status = 'active';
                                last_check_reason_code = 'active_confirmed';
                                alert_reason = 'none';
                                alert_level = 'normal';
                                failure_count = 0;
                                
                                const priceText = await page.evaluate(() => {
                                    let el = document.querySelector('[data-testid="price"]');
                                    if (el) return el.innerText;
                                    el = document.querySelector('mer-price');
                                    if (el) return el.innerText;
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
                                console.log(`[WATCH] ACTIVE watch_id=${item.watch_id}`);
                                break;
                            } else {
                                // 条件を満たさない（Skeletonが残っている、価格が取れない等）
                                if (attempt < 3) {
                                    console.log(`[WATCH] INCOMPLETE DOM DETECTED (Attempt ${attempt}/3) watch_id=${item.watch_id}`);
                                    const waitMs = Math.floor(Math.random() * 2000) + 1000;
                                    await page.waitForTimeout(waitMs);
                                    continue;
                                }
                                alert_level = 'warning';
                                alert_reason = hasSkeleton ? 'unknown_skeleton' : 'unknown_incomplete_dom';
                                last_check_reason_code = alert_reason;
                                last_known_status = 'unknown';
                                failure_count = 0;
                                console.log(`[WATCH] UNKNOWN watch_id=${item.watch_id} reason=${alert_reason}`);
                                break;
                            }
                        } catch (error) {
                            console.log(`[WATCH] Error on attempt ${attempt} for ${item.watch_id}: ${error.message}`);
                            if (attempt < 3) {
                                const waitMs = Math.floor(Math.random() * 2000) + 1000;
                                await page.waitForTimeout(waitMs);
                            } else {
                                // 最終的なタイムアウトやエラー
                                failure_count++;
                                alert_level = failure_count >= 2 ? 'danger' : 'warning';
                                alert_reason = 'failed_timeout';
                                last_check_reason_code = 'failed_timeout';
                                last_known_status = 'failed';
                                console.error(`[WATCH] CHECK_FAILED watch_id=${item.watch_id} failures=${failure_count}`);
                            }
                        }
                    } // end retry loop
                    
                    // Update item states — preserve previous price for color-coded comparison in UI
                    const u = this.updateWatchItem(item.watch_id, {
                        last_known_status,
                        previous_known_price: item.last_known_price,
                        last_known_price,
                        alert_level,
                        alert_reason,
                        is_resolved: false,
                        failure_count,
                        last_check_url,
                        last_check_title,
                        last_check_text: last_check_text.substring(0, 500),
                        last_check_evidence,
                        last_check_reason_code,
                        last_checked_at: new Date().toISOString()
                    });
                    if (u) {
                        results.push(u);
                        console.log(`[INV_CHECK_RESULT] watch_id=${u.watch_id} asin=${u.amazon_asin} status=${u.last_known_status} alert=${u.alert_level} url=${u.mercari_url}`);
                    } else {
                        console.warn(`[INV_CHECK_RESULT] watch_id=${item.watch_id} updateWatchItem returned null (item not found in store)`);
                    }
                } catch (e) {
                    console.error(`[WATCH] Critical error processing item ${item.watch_id}:`, e);
                } finally {
                    if (page) await page.close().catch(() => null);
                }
            };

            // Sequential processing: 1 item at a time with delay between items
            for (let idx = 0; idx < targetItems.length; idx++) {
                const item = targetItems[idx];
                console.log(`[INV_CHECK_QUEUE_ITEM] index=${idx + 1}/${targetItems.length} watch_id=${item.watch_id} asin=${item.amazon_asin}`);
                try {
                    await processItem(item);
                } catch (e) {
                    console.error(`[INV_CHECK_QUEUE_ITEM_FAILED] watch_id=${item.watch_id}`, e.message);
                }
                if (idx < targetItems.length - 1) {
                    console.log(`[INV_CHECK_QUEUE_DELAY] ms=${DELAY_MS}`);
                    await new Promise(r => setTimeout(r, DELAY_MS));
                }
            }
        } finally {
            if (browserContext) {
                await browserContext.close().catch(() => {});
            }
        }

        const failedCount = results.filter(r => r.last_known_status === 'failed').length;
        console.log(`[INV_CHECK_QUEUE_DONE] checked=${results.length} skipped=${alreadySoldItems.length} failed=${failedCount}`);
        return { results, skipped_count: alreadySoldItems.length, failed_count: failedCount };
    }
}

module.exports = { InventoryService };
