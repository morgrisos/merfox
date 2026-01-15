import puppeteer, { Browser, Page } from 'puppeteer';
import { MerItem, ScraperConfig, ExecutionStats } from '../types';
import { StorageService } from '../storage';
import { FilterService } from '../filter';
import { SafetyService } from '../safety';
import { parseItemPage } from './parser';

const LIST_ITEM_SELECTOR = 'li[data-testid="item-cell"] a';

export class ScraperService {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private config: ScraperConfig;
    private storage: StorageService;
    public readonly stats: ExecutionStats;
    private filterService: FilterService;
    private safetyService: SafetyService;
    private isRunning: boolean = false;

    constructor(config: ScraperConfig, storage: StorageService) {
        this.config = config;
        this.storage = storage;
        this.stats = {
            totalScanned: 0,
            collected: 0,
            excluded: { shops: 0, shipping: 0, ng: 0, price: 0, unknown: 0 },
            errors: 0,
            status: 'idle'
        };
        this.filterService = new FilterService(config, this.stats);
        this.safetyService = new SafetyService(config);
    }

    async start() {
        this.isRunning = true;
        this.stats.status = 'running';

        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            this.page = await this.browser.newPage();
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            const startUrl = this.config.url || 'https://jp.mercari.com';

            console.log(`Starting scrape on ${startUrl} in ${this.config.mode} mode (Method: ${this.config.watchInterval ? 'Watch' : 'Bulk'})`);

            // Use watchInterval presence to determine mode
            if (this.config.watchInterval) {
                await this.runWatchMode(startUrl);
            } else {
                await this.runBulkMode(startUrl);
            }

        } catch (e) {
            console.error('Scraper Error:', e);
            this.stats.errors++;
        } finally {
            await this.stop();
        }
    }

    async stop() {
        this.isRunning = false;
        this.stats.status = 'stopping';
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        this.stats.status = this.stats.errors > 10 ? 'error' : 'completed';
    }

    private async runBulkMode(url: string) {
        if (!this.page) return;
        await this.page.goto(url, { waitUntil: 'networkidle2' });

        while (this.isRunning) {
            const safety = this.safetyService.shouldStop(this.stats);
            if (safety.stop) {
                console.log(`Stopping: ${safety.reason}`);
                this.isRunning = false;
                break;
            }

            const productLinks = await this.page.$$eval(LIST_ITEM_SELECTOR, (els) => els.map(el => (el as HTMLAnchorElement).href));

            for (const link of productLinks) {
                if (!this.isRunning) break;
                if (this.safetyService.shouldStop(this.stats).stop) { this.isRunning = false; break; }

                const idMatch = link.match(/items\/(m\d+)/);
                if (!idMatch) continue;
                const itemId = idMatch[1];

                if (this.storage.hasVisitedId(itemId)) {
                    continue;
                }

                this.stats.totalScanned++;
                await this.processItemPage(link);
                await this.sleep(this.getDelay());
            }

            if (!this.isRunning) break;
            const previousHeight = await this.page.evaluate('document.body.scrollHeight');
            await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await this.sleep(2000);
            const newHeight = await this.page.evaluate('document.body.scrollHeight');

            if (newHeight === previousHeight) {
                console.log('No more items (scroll end)');
                break;
            }
        }
    }

    private async runWatchMode(url: string) {
        if (!this.page) return;

        let watchUrl = url;
        if (!watchUrl.includes('sort=created_time')) {
            const separator = watchUrl.includes('?') ? '&' : '?';
            watchUrl += `${separator}sort=created_time&order=desc`;
        }

        while (this.isRunning) {
            const safety = this.safetyService.shouldStop(this.stats);
            if (safety.stop) {
                console.log(`Stopping: ${safety.reason}`);
                this.isRunning = false;
                break;
            }

            console.log('Checking for new items...');
            await this.page.goto(watchUrl, { waitUntil: 'networkidle2' });

            const productLinks = await this.page.$$eval(LIST_ITEM_SELECTOR, (els) => els.map(el => (el as HTMLAnchorElement).href));

            let newFound = 0;
            for (const link of productLinks) {
                if (!this.isRunning) break;
                if (this.safetyService.shouldStop(this.stats).stop) { this.isRunning = false; break; }

                const idMatch = link.match(/items\/(m\d+)/);
                if (!idMatch) continue;
                const itemId = idMatch[1];

                if (this.storage.hasVisitedId(itemId)) {
                    continue;
                }

                this.stats.totalScanned++;
                newFound++;
                await this.processItemPage(link);
                await this.sleep(this.getDelay());
            }

            if (newFound === 0) {
                console.log('No new items found.');
            }

            const intervalMins = this.config.watchInterval || 30;
            console.log(`Waiting ${intervalMins} mins...`);
            const sleepEnd = Date.now() + intervalMins * 60 * 1000;
            while (Date.now() < sleepEnd && this.isRunning) {
                await this.sleep(1000);
            }
        }
    }

    private async processItemPage(url: string) {
        const newPage = await this.browser?.newPage();
        if (!newPage) return;

        try {
            await newPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await newPage.goto(url, { waitUntil: 'domcontentloaded' });

            const rawItem = await parseItemPage(newPage, url);

            if (rawItem && rawItem.item_id) {
                const fullItem: MerItem = rawItem as MerItem;

                if (this.filterService.shouldExclude(fullItem)) {
                    console.log(`Excluded: ${fullItem.item_id}`);
                } else {
                    await this.storage.appendRawItem(fullItem);
                    this.stats.collected++;
                    console.log(`Collected: ${fullItem.title}`);
                }
            } else {
                this.stats.errors++;
            }

        } catch (e) {
            console.error(`Error processing ${url}`, e);
            this.stats.errors++;
            await this.storage.logError(url, e instanceof Error ? e.message : 'Unknown');
        } finally {
            await newPage.close();
        }
    }

    private getDelay(): number {
        return 2000;
    }

    private sleep(ms: number) {
        return new Promise(r => setTimeout(r, ms));
    }
}
