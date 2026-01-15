
// --- IPC / Backend Types ---
export interface ScraperConfig {
    mode: 'url' | 'keyword'; // target.mode
    url?: string;
    keyword?: string;
    excludeKeyword?: string;
    category?: string;

    // Filters
    maxPrice?: number;
    minPrice?: number;
    excludeShops: boolean;
    excludeUnknown: boolean;
    excludeShippingPaid: boolean;
    ngWords: string[];
    ngRegex?: string[];

    // Limits
    countLimit?: number;
    timeLimit?: number;

    outputDir: string;
    watchInterval?: number;
}

export type ExecutionStats = {
    totalScanned: number;
    collected: number;
    excluded: {
        shops: number;
        shipping: number;
        ng: number;
        price: number;
        unknown: number;
    };
    errors: number;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopping';
    currentRunDir?: string;
};

// --- Converter Types ---
export interface MerItem {
    item_id: string;
    item_url: string;
    title: string;
    price_yen: number;
    description: string;
    status: string;
    seller_name?: string;
    seller_ratings?: number;

    // Mapped fields
    amazon_product_id?: string;
    amazon_product_id_type?: string;

    [key: string]: any;
}

// --- Frontend / State Types (V4 Port) ---

export type SearchTarget = {
    mode: 'url' | 'keyword';
    url: string;
    keyword: string;
    excludeKeyword: string;
    category: string;
    sort: 'new' | 'recommended';
};

export type PresetMode = 'beginner' | 'custom';
export type CollectionMode = 'bulk' | 'watch';
export type WatchInterval = 25 | 30 | 45 | 60;

export type Filters = {
    excludeShops: boolean;
    excludeUnknown: boolean; // default true
    onlyFreeShipping: boolean; // "送料無料だけ"
    ngWords: string[]; // partial match
    ngRegex: string[]; // regex
    ngTargetTitle: boolean;
    ngTargetDescription: boolean;
};

export type StopConditions = {
    useCount: boolean;
    countLimit: number; // default 1000
    useTime: boolean;
    timeLimit: number; // default 25, max 60
};

export type AppSettings = {
    target: SearchTarget;
    preset: PresetMode;
    collectionMode: CollectionMode;
    watchInterval: WatchInterval;
    filters: Filters;
    stopConditions: StopConditions;
    outputDir: string; // "Last execution folder" concept
};

export const DEFAULT_SETTINGS: AppSettings = {
    target: {
        mode: 'url',
        url: '',
        keyword: '',
        excludeKeyword: '',
        category: '',
        sort: 'new'
    },
    preset: 'beginner',
    collectionMode: 'watch',
    watchInterval: 25,
    filters: {
        excludeShops: true,
        excludeUnknown: true,
        onlyFreeShipping: true,
        ngWords: [],
        ngRegex: [],
        ngTargetTitle: true,
        ngTargetDescription: false
    },
    stopConditions: {
        useCount: true,
        countLimit: 1000,
        useTime: true,
        timeLimit: 25
    },
    outputDir: ''
};

export type ShopType = 'official' | 'personal' | 'unknown' | 'shops' | 'normal';
