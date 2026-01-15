import { MerItem, ScraperConfig, ExecutionStats } from '../types';

export class FilterService {
    private config: ScraperConfig;
    private stats: ExecutionStats;

    constructor(config: ScraperConfig, stats: ExecutionStats) {
        this.config = config;
        this.stats = stats;
    }

    shouldExclude(item: MerItem): boolean {
        // 1. Shops Exclusion (Shops or Unknown)
        if (this.config.excludeShops) {
            if (item.seller_type === 'shops' || item.seller_type === 'unknown') {
                if (item.seller_type === 'shops') this.stats.excluded.shops++;
                if (item.seller_type === 'unknown') this.stats.excluded.unknown++;
                return true;
            }
        }

        // 2. Shipping Filter (Free only)
        if (this.config.excludeShippingPaid) {
            if (!item.shipping_free) {
                this.stats.excluded.shipping++;
                return true;
            }
        }

        // 3. Price Filter
        // Max price is 100,000 fixed safety, plus user config
        const maxPrice = Math.min(this.config.maxPrice ?? 100000, 100000);
        if (item.price_yen > maxPrice) {
            this.stats.excluded.price++;
            return true;
        }
        if (this.config.minPrice && item.price_yen < this.config.minPrice) {
            this.stats.excluded.price++; // Count as price exclusion
            return true;
        }

        // 4. NG Words (Title & Description)
        // Combine text for checking
        const textToCheck = (item.title + ' ' + (item.description || '')).toLowerCase();

        // Partial Match
        if (this.config.ngWords && this.config.ngWords.length > 0) {
            for (const word of this.config.ngWords) {
                if (textToCheck.includes(word.toLowerCase())) {
                    this.stats.excluded.ng++;
                    return true;
                }
            }
        }

        // Regex Match
        if (this.config.ngRegex && this.config.ngRegex.length > 0) {
            for (const pattern of this.config.ngRegex) {
                try {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(textToCheck)) {
                        this.stats.excluded.ng++;
                        return true;
                    }
                } catch (e) {
                    console.warn('Invalid Regex in config:', pattern);
                }
            }
        }

        return false;
    }
}
