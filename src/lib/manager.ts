import { ScraperService } from './scraper/scrapers';
import { StorageService } from './storage';
import { ScraperConfig, ExecutionStats } from './types';
import { AmazonConverter } from './converter';

class ScraperManager {
    private static instance: ScraperManager;
    private scraper: ScraperService | null = null;
    private stats: ExecutionStats = {
        totalScanned: 0,
        collected: 0,
        excluded: { shops: 0, shipping: 0, ng: 0, price: 0, unknown: 0 },
        errors: 0,
        status: 'idle',
        currentRunDir: undefined
    };

    private constructor() { }

    static getInstance(): ScraperManager {
        if (!ScraperManager.instance) {
            ScraperManager.instance = new ScraperManager();
        }
        return ScraperManager.instance;
    }

    async start(config: ScraperConfig) {
        if (this.scraper) {
            // Already running?
            // Check status
        }

        const storage = await StorageService.init(config.outputDir);
        this.stats.currentRunDir = storage.getExecutionPath(); // Store path
        this.scraper = new ScraperService(config, storage);

        // Start async, don't await
        this.scraper.start().then(() => {
            // On completion (scraper.start resolves when stopped)
            // Run conversion
            AmazonConverter.convert(storage.getExecutionPath(), { maxPrice: config.maxPrice, minPrice: config.minPrice })
                .then(res => console.log(`Conversion result: ${res.converted} converted, ${res.failed} failed`));
        }).catch(err => {
            console.error("Manager: Scraper crashed", err);
        });
    }

    async stop() {
        if (this.scraper) {
            await this.scraper.stop();
            this.scraper = null;
        }
    }

    getStats(): ExecutionStats {
        if (this.scraper) {
            // Access private stats via a getter if possible, 
            // or we need to expose stats in ScraperService
            // I will fix ScraperService to expose 'stats' getter or public field
            // For now, let's assume I can hack it or fix it.
            // ScraperService stats are private. I need to make them public readonly.
            return (this.scraper as any).stats;
        }
        return this.stats;
    }
}

// Global for development (hot reload safety)
const globalForManager = global as unknown as { scraperManager: ScraperManager };
export const scraperManager = globalForManager.scraperManager || ScraperManager.getInstance();
if (process.env.NODE_ENV !== 'production') globalForManager.scraperManager = scraperManager;
