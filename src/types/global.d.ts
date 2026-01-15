import { ScraperConfig, ExecutionStats } from '@/lib/types';

export { };

declare global {
    interface Window {
        electron: {
            start: (config: ScraperConfig) => Promise<{ success: boolean; error?: string }>;
            stop: () => Promise<{ success: boolean }>;
            onStatus: (callback: (stats: ExecutionStats) => void) => () => void;
            openFolder: (path?: string) => Promise<void>;
            openFile: (path: string) => Promise<void>;
        };
    }
}
