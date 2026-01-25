"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
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
