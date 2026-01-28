const EventEmitter = require('events');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { ExportService } = require('./ExportService');
const { AsinService } = require('./AsinService');

class Scraper extends EventEmitter {
    constructor(runId, mode, targetUrl, config) {
        super();
        this.runId = runId;
        this.mode = mode; // 'onetime' | 'watch' | 'bulk'
        this.targetUrl = targetUrl;
        this.config = config || {};
        this.isRunning = false;
        this.isStopped = false;

        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            excluded: 0,
            excludedBreakdown: { shops: 0, unknown: 0, price: 0, ng: 0, shipping: 0 }
        };

        this.items = []; // Store raw items
        this.browser = null;
        this.runDir = null;
        this.logPath = null;
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        this.emit('log', { message, level, timestamp });

        // Dual Logging
        if (this.logPath) {
            try {
                fs.appendFileSync(this.logPath, `[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
            } catch (e) {
                console.error('Failed to write to log file:', e);
            }
        }
    }

    updateStats() {
        this.emit('stats', this.stats);
    }

    updateProgress(phase, percentage) {
        this.emit('progress', { phase, percentage });
    }

    stop() {
        this.isStopped = true;
        this.log('ユーザーによって停止ボタンが押されました。', 'warn');
    }

    async gotoWithRetry(page, url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
                const status = response ? response.status() : 'unknown';
                this.log(`Navigated to ${url} (Status: ${status})`, 'info');
                return response;
            } catch (e) {
                if (i === retries - 1) throw e;
                this.log(`Retrying navigation (${i + 1}/${retries})...`, 'warn');
                await page.waitForTimeout(2000 * (i + 1));
            }
        }
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // -- Unified Storage Setup --
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            // Fix: Use resolve to be absolutely sure where we are
            // __dirname is server/engine, so ../runs is server/runs
            const runsRoot = process.env.MERFOX_RUNS_DIR
                ? path.resolve(process.env.MERFOX_RUNS_DIR)
                : path.resolve(__dirname, '../runs');

            this.runDir = path.join(runsRoot, `${dateStr}_${this.runId}`);

            console.log(`[Scraper] Creating run dir: ${this.runDir}`);

            if (!fs.existsSync(this.runDir)) {
                fs.mkdirSync(this.runDir, { recursive: true });
            }
            this.logPath = path.join(this.runDir, 'run.log');
        } catch (e) {
            console.error('Failed to setup storage:', e);
            // Continue but logging might fail
        }

        this.log(`開始: ${this.mode} モード`);
        this.log(`ターゲット: ${this.targetUrl}`, 'info');

        try {
            await this.execute();

            // Save CSV
            if (this.items.length > 0 && this.runDir) {
                const outputPath = path.join(this.runDir, 'raw.csv');
                // P1.6: Enforce column order
                const csvData = stringify(this.items, {
                    header: true,
                    bom: true,
                    columns: CSV_COLUMNS
                });
                fs.writeFileSync(outputPath, csvData);
                this.log(`RAW CSVを保存しました: ${outputPath}`, 'success');

                // [P4 Restoration] Call services
                // this.log('Amazon TSVへの変換を開始します...', 'info');

                // P4.2 ASIN
                // const asinResult = await AsinService.run(this.runDir, this.items);
                // this.stats = { ...this.stats, ...asinResult }; // Merge asinStats

                // P4.1 Profit & Export
                // Pass config options if any
                // const exportResult = await ExportService.run(this.runDir, this.items, this.config);
                // this.stats = { ...this.stats, ...exportResult }; // Merge profitStats, exportStats

                // this.log(`変換完了: Success=${this.stats.exportStats.tsv_rows} Failed=${this.stats.exportStats.failed_rows}`, 'success');

                this.logSummary(); // Write detailed summary to log

                // Extract IDs of successfully processed items for history update
                const successfulItemIds = this.items.map(i => i.item_id);

                this.emit('done', {
                    success: true,
                    outputPath,
                    summary: this.stats,
                    newItemsCount: successfulItemIds.length,
                    newItemIds: successfulItemIds // [P2.3] Return gathered IDs
                });
            } else {
                // Even if empty, generate header-only CSV for consistency
                if (this.runDir) {
                    const outputPath = path.join(this.runDir, 'raw.csv');
                    const csvData = stringify([], { header: true, bom: true, columns: CSV_COLUMNS });
                    fs.writeFileSync(outputPath, csvData);

                    // [P4 Restoration] Even if empty, run services to generate empty artifacts
                    const asinResult = await AsinService.run(this.runDir, []); // Empty
                    this.stats = { ...this.stats, ...asinResult };
                    const exportResult = await ExportService.run(this.runDir, [], this.config);
                    this.stats = { ...this.stats, ...exportResult };

                    this.logSummary();
                }
                this.emit('done', {
                    success: true,
                    summary: this.stats,
                    newItemsCount: 0,
                    newItemIds: []
                });
            }

        } catch (error) {
            this.log(`重大なエラー: ${error.message}`, 'error');
            this.emit('done', { success: false, error: error.message });
        } finally {
            this.isRunning = false;
            if (this.browser) await this.browser.close().catch(() => { });
        }
    }

    async execute() {
        console.log('DEBUG: execute() called');
        this.log('ブラウザを起動中...', 'info');
        this.updateProgress('INIT', 5);

        console.log('DEBUG: Launching chromium...');
        this.browser = await chromium.launch({ headless: true });
        console.log('DEBUG: Browser launched');

        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        console.log('DEBUG: Page created');

        try {
            // Phase 1: Search Results
            this.updateProgress('FETCH_LIST', 10);
            this.log('検索結果ページへアクセス中...');

            // Retry Policy
            await this.gotoWithRetry(page, this.targetUrl);

            // Wait for items
            try {
                await Promise.any([
                    page.waitForSelector('[data-testid="item-list"]', { timeout: 5000 }),
                    page.waitForSelector('#item-grid', { timeout: 5000 }),
                    page.waitForSelector('a[href*="/item/m"]', { timeout: 5000 })
                ]);
            } catch (e) {
                this.log('商品リストのロード待機でタイムアウトしましたが、取得を試みます。', 'warn');
            }

            let foundLinks = [];
            let newItemIds = [];
            let retryScroll = 0;
            const stopLimit = this.config.stopLimit || 50;
            const lastSeenItemId = this.config.lastSeenItemId;
            const seenHistory = new Set(this.config.seenHistory || []);

            console.log(`[DiffLogic] lastSeen=${lastSeenItemId}, historySize=${seenHistory.size}`);

            // Scroll to collect links
            let reachedKnownItem = false;

            while (foundLinks.length < stopLimit && retryScroll < 10) {
                if (this.isStopped) break;

                // Get current items
                const newLinks = await page.$$eval('a[href*="/item/m"]', as => as.map(a => a.href));
                // Extract IDs to check diff
                const uniqueLinks = [...new Set(newLinks)].filter(l => l.includes('/item/m'));

                // Check for known items
                for (const link of uniqueLinks) {
                    const id = link.split('/item/')[1].split('?')[0];

                    if (seenHistory.has(id) || (lastSeenItemId && id === lastSeenItemId)) {
                        console.log(`[DiffLogic] Found known item: ${id}. Stopping fetch.`);
                        reachedKnownItem = true;
                        break;
                    }

                    if (!foundLinks.includes(link)) {
                        foundLinks.push(link);
                        newItemIds.push(id);
                    }
                }

                if (reachedKnownItem) break;
                if (foundLinks.length >= stopLimit) break;

                // Scroll if needed
                if (!reachedKnownItem && foundLinks.length < stopLimit) {
                    retryScroll++;
                    await page.evaluate(() => window.scrollBy(0, 800));
                    await page.waitForTimeout(1000);
                }
            }

            if (foundLinks.length === 0) {
                if (reachedKnownItem) {
                    this.log('新しい商品は見つかりませんでした (All known).', 'success'); // Not error
                } else {
                    this.log('商品リンクが1つも見つかりませんでした。', 'warn');
                    // [Diagnosis] Log reasons for 0 items
                    const title = await page.title();
                    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n/g, ' '));
                    const listSelector = '[data-testid="item-list"], #item-grid, a[href*="/item/m"]';
                    const hasList = await page.evaluate((sel) => !!document.querySelector(sel), listSelector);

                    this.log(`[Diagnosis] Title: ${title}`);
                    this.log(`[Diagnosis] Selector '${listSelector}' found: ${hasList}`);
                    this.log(`[Diagnosis] Body Snippet: ${bodySnippet}`);
                }
            } else {
                this.log(`新規収集対象: ${foundLinks.length}件。詳細取得を開始します。`, 'info');
                this.stats.total = foundLinks.length;
                this.updateStats();
            }

            // Clip to limit
            foundLinks = foundLinks.slice(0, stopLimit);

            // Phase 2: Detail Fetching
            for (let i = 0; i < foundLinks.length; i++) {
                if (this.isStopped) break;
                const url = foundLinks[i];
                const itemId = url.split('/item/')[1].split('?')[0];

                this.updateProgress('FETCH_DETAIL', 30 + Math.floor((i / foundLinks.length) * 60));

                try {
                    await this.gotoWithRetry(page, url);

                    // Basic extraction
                    const title = await page.textContent('h1').catch(() => '');
                    const priceText = await page.textContent('[data-testid="price"]').catch(() => '0');
                    const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

                    // -- Filters --

                    // 1. Price Limit
                    if (price > 100000) {
                        this.log(`除外: 価格超過 (${price}円) - ${itemId}`, 'warn');
                        this.stats.excluded++;
                        this.stats.excludedBreakdown.price++;
                        this.updateStats();
                        continue;
                    }

                    // 2. Shops check
                    // Mercari Shops items usually have specific class or label.

                    // 3. NG Words
                    const description = await page.textContent('[data-testid="description"]').catch(() => '');
                    if (this.config.excludeKeywords) {
                        const keywords = this.config.excludeKeywords.split(',').map(s => s.trim()).filter(Boolean);
                        const isNg = keywords.some(kw => title.includes(kw) || description.includes(kw));
                        if (isNg) {
                            this.log(`除外: NGワード - ${itemId}`, 'warn');
                            this.stats.excluded++;
                            this.stats.excludedBreakdown.ng++;
                            this.updateStats();
                            continue;
                        }
                    }


                    // Success
                    this.stats.success++;
                    this.items.push({
                        collected_at: new Date().toISOString(),
                        site: 'mercari',
                        item_id: itemId,
                        item_url: url,
                        title: title.trim(),
                        price_yen: price,
                        shipping_free: true,
                        seller_type: 'normal',
                        image_count: 1,
                        first_image_url: '',
                        condition: '', // [NEW] P1.6 Schema Fix
                        description: description.slice(0, 100).replace(/\n/g, ' ')
                    });
                    this.log(`取得成功: ${title.slice(0, 15)}... (${price}円)`, 'success');

                } catch (e) {
                    this.log(`詳細取得失敗: ${itemId} - ${e.message}`, 'error');
                    this.stats.failed++;
                }

                this.updateStats();
                // Random sleep to be nice
                await page.waitForTimeout(1000 + Math.random() * 2000);
            }

            this.updateProgress('DONE', 100);

        } catch (e) {
            throw e;
        }
    }

    logSummary() {
        const stats = this.stats;
        this.log(`RUN SUMMARY (runId: ${this.runId})`);

        // Export Stats
        const exp = stats.exportStats || { tsv_rows: 0, failed_rows: 0, reasons_top: 'none' };
        this.log(`Export: tsv_rows=${exp.tsv_rows} failed_rows=${exp.failed_rows} reasons_top=${exp.reasons_top}`);

        // Calc Stats
        const prof = stats.profitStats || { profit_rows: 0, failed_rows: 0, reasons_top: 'none' };
        this.log(`Calc: profit_rows=${prof.profit_rows} failed_rows=${prof.failed_rows} reasons_top=${prof.reasons_top}`);

        // ASIN Stats
        const asin = stats.asinStats || { matched_rows: 0, failed_rows: 0, reasons_top: 'none' };
        this.log(`ASIN: matched_rows=${asin.matched_rows} failed_rows=${asin.failed_rows} reasons_top=${asin.reasons_top}`);

        // CSV Stats
        // this.log(`CSV: total=${stats.total} success=${stats.success} failed=${stats.failed} excluded=${stats.excluded}`);
    }
}

// [NEW] Fixed Column Order for P1.6
const CSV_COLUMNS = [
    'collected_at',
    'site',
    'item_id',
    'item_url',
    'title',
    'price_yen',
    'shipping_free',
    'seller_type',
    'image_count',
    'first_image_url',
    'condition', // [NEW]
    'description'
];

module.exports = { Scraper };
