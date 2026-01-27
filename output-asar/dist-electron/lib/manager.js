"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperManager = void 0;
// @ts-ignore
const { Scraper } = require('../../server/engine/Scraper.js');
class ScraperManager {
    constructor() {
        this.activeScraper = null;
        this.stats = { total: 0, success: 0, failed: 0 };
    }
    async start(config) {
        if (this.activeScraper) {
            console.warn('[Manager] Scraper already running, stopping previous instance...');
            await this.stop();
        }
        const runId = 'electron-' + Date.now();
        console.log(`[Manager] Starting run ${runId} with config:`, config);
        // Mock emitter to capture stats for Electron UI
        const emitter = {
            emit: (event, data) => {
                if (event === 'stats') {
                    this.stats = { ...this.stats, ...data };
                }
                else if (event === 'log') {
                    // Could pipe logs to electron-log here if needed
                }
            }
        };
        this.activeScraper = new Scraper(runId, {
            stopLimit: 50,
            ...config
        }, emitter);
        try {
            this.stats = { total: 0, success: 0, failed: 0 }; // Reset
            await this.activeScraper.run();
        }
        catch (e) {
            console.error('[Manager] Scraper run failed:', e);
            throw e;
        }
        finally {
            this.activeScraper = null;
        }
    }
    async stop() {
        if (this.activeScraper) {
            console.log('[Manager] Stopping scraper...');
            this.activeScraper.isStopped = true;
            // giving it a moment to break loop
            await new Promise(r => setTimeout(r, 500));
            this.activeScraper = null;
        }
    }
    getStats() {
        return this.stats;
    }
}
exports.scraperManager = new ScraperManager();
