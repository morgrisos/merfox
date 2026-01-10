
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
}

export interface RunRecord {
    id: string; // UUID
    date: string; // ISO string
    status: 'running' | 'completed' | 'failed' | 'stopped';
    targetUrl: string;
    platform: 'mercari' | 'shopee';
    mode: 'onetime' | 'watch' | 'bulk';
    stats: {
        total: number;
        success: number;
        failed: number;
        excluded: number;
    };
    logs: LogEntry[];
    failureReasons: FailureDetail[];
    failedUrls: FailedUrl[];
}
