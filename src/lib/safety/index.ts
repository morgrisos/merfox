import { ScraperConfig, ExecutionStats } from '../types';

export class SafetyService {
    private config: ScraperConfig;
    private startTime: number;
    private MAX_DAILY_ITEMS = 1000;
    private MAX_TIME_MINUTES = 60;

    constructor(config: ScraperConfig) {
        this.config = config;
        this.startTime = Date.now();
    }

    shouldStop(stats: ExecutionStats): { stop: boolean; reason?: string } {
        // 1. User Stop Signal
        if (!stats.status || stats.status === 'stopping') {
            return { stop: true, reason: 'user_stop' };
        }

        // 2. Count Limit
        if (this.config.countLimit && stats.collected >= this.config.countLimit) {
            return { stop: true, reason: 'count_limit_reached' };
        }

        // 3. Safety: Daily Max (FIXED 1000)
        if (stats.collected >= this.MAX_DAILY_ITEMS) {
            return { stop: true, reason: 'safety_max_daily_limit' };
        }

        // 4. Time Limit
        const elapsedMinutes = (Date.now() - this.startTime) / 1000 / 60;

        // User Config Time (default 5, max 60)
        const limitMinutes = Math.min(this.config.timeLimit || 5, this.MAX_TIME_MINUTES);

        if (elapsedMinutes >= limitMinutes) {
            return { stop: true, reason: 'time_limit_reached' };
        }

        return { stop: false };
    }
}
