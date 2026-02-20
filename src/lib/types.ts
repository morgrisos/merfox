export type SearchTarget = {
    mode: 'url' | 'keyword';
    url: string;
    keyword: string;
    excludeKeyword: string;
    // category removed per v0.31 Strict Spec
    sort: 'new' | 'recommended';
};

export interface MerItem {
    item_id: string;
    title: string;
    price_yen: number;
    item_url?: string;
    amazon_product_id?: string;
    amazon_product_id_type?: string;
    [key: string]: any;
}

export type PresetMode = 'beginner' | 'custom';
export type CollectionMode = 'bulk' | 'watch';
export type WatchInterval = 25 | 30 | 45 | 60;

export type ExecutionStats = {
    total: number;
    success: number;
    failed: number;
    duration: number;
};

export type Filters = {
    excludeShops: boolean;
    excludeUnknown: boolean;
    onlyFreeShipping: boolean;
    excludeKeywords: string[];
    ngRegex: string[];
    ngTargetTitle: boolean;
    ngTargetDescription: boolean;
};

export type StopConditions = {
    useCount: boolean;
    countLimit: number;
    useTime: boolean;
    timeLimit: number;
};

export type AppSettings = {
    runType: 'test' | 'production';
    target: SearchTarget;
    preset: PresetMode;
    collectionMode: CollectionMode;
    watchInterval: WatchInterval;
    filters: Filters;
    stopConditions: StopConditions;
    outputDir: string;
};

export const DEFAULT_SETTINGS: AppSettings = {
    runType: 'test',
    target: {
        mode: 'url',
        url: '',
        keyword: '',
        excludeKeyword: '',
        sort: 'new'
    },
    preset: 'beginner',
    collectionMode: 'watch',
    watchInterval: 25,
    filters: {
        excludeShops: true,
        excludeUnknown: true,
        onlyFreeShipping: true,
        excludeKeywords: [], // Default empty
        ngRegex: [],
        ngTargetTitle: true,
        ngTargetDescription: false
    },
    stopConditions: {
        useCount: true,
        countLimit: 100, // v0.31 Default (Production focus)
        useTime: true,
        timeLimit: 25
    },
    outputDir: ''
};

// [ELECTRON] Helper configuration for IPC
export interface ScraperConfig {
    outputDir: string;
    targetUrl?: string;
    stopLimit?: number;
    excludeKeywords?: string;
    // Allow any other config options that Scraper.js might accept
    [key: string]: any;
}
