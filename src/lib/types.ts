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
    // excludeHighPrice is fixed logic, but maybe we store it if we want to toggle? 
    // Spec says "Safety device: High price exclusion: 1,000,000 yen (Fixed)". 
    // So we effectively just display it, but maybe we keep it in state for "system" usage?
    // Let's keep it implicit or just constant.
};

export type StopConditions = {
    useCount: boolean;
    countLimit: number; // default 1000
    useTime: boolean;
    timeLimit: number; // default 25, max 60
    // Manual is always available
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
