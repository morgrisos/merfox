export interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
}

export interface FailureDetail {
    reason: string;
    count: number;
}

export interface FailedUrl {
    url: string;
    reason: string;
    title?: string;
}

export interface RunRecord {
    id: string; // UUID
    name?: string; // Display Name (Folder)
    date: string; // ISO string
    path?: string; // Absolute path
    status: 'running' | 'completed' | 'failed' | 'stopped';
    targetUrl?: string;
    platform?: 'mercari' | 'shopee';
    mode?: 'onetime' | 'watch' | 'bulk';
    stats: {
        totalScanned?: number;
        success: number;
        failed: number;
        excluded: number;
        currentRunDir?: string;
    };
    logs?: LogEntry[];
    failureReasons: FailureDetail[];
    failedUrls: FailedUrl[];
    
    // Artifact Flags
    hasAmazon?: boolean;
    hasProfit?: boolean;
    hasAsin?: boolean;
    hasRaw?: boolean;
}
