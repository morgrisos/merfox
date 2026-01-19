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
    excludeUnknown: boolean;
    onlyFreeShipping: boolean;
    ngWords: string[];
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
    target: SearchTarget;
    preset: PresetMode;
    collectionMode: CollectionMode;
    watchInterval: WatchInterval;
    filters: Filters;
    stopConditions: StopConditions;
    outputDir: string;
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

// [ELECTRON] Helper configuration for IPC
export interface ScraperConfig {
    outputDir: string;
    targetUrl?: string;
    stopLimit?: number;
    excludeKeywords?: string;
    // Allow any other config options that Scraper.js might accept
    [key: string]: any;
}
