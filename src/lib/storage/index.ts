import fs from 'fs/promises';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { MerItem } from '../types';

const RAW_HEADER = [
    'collected_at', 'site', 'item_id', 'item_url', 'title', 'price_yen',
    'shipping_free', 'seller_type', 'image_count', 'first_image_url',
    'condition', 'description',
    'amazon_product_id', 'amazon_product_id_type', 'id_source', 'id_imported_at'
];

export class StorageService {
    private executionDir: string;
    private visitedIds: Set<string> = new Set();

    constructor(executionDir: string) {
        this.executionDir = executionDir;
    }

    static async init(baseDir: string): Promise<StorageService> {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        let runId = 1;
        let dirName = `${today}_run${String(runId).padStart(3, '0')}`;
        let fullPath = path.join(baseDir, dirName);

        // Find next available run ID
        while (true) {
            try {
                await fs.access(fullPath);
                runId++;
                dirName = `${today}_run${String(runId).padStart(3, '0')}`;
                fullPath = path.join(baseDir, dirName);
            } catch {
                break; // Directory doesn't exist, use this one
            }
        }

        await fs.mkdir(fullPath, { recursive: true });

        // Create files defined in spec (Section 12)
        const files = [
            'raw.csv',
            'amazon_test.tsv',
            'amazon_convert_report.csv',
            'amazon_convert_failed.csv',
            'failed_urls.csv',
            'run.log',
            'mapping.csv',
            'soldout_candidates.csv'
        ];

        for (const file of files) {
            const filePath = path.join(fullPath, file);
            // Initialize with BOM + Header if empty
            // Only for raw.csv and reports we care about headers immediately
            if (file === 'raw.csv') {
                const bom = '\ufeff';
                const header = stringify([RAW_HEADER]);
                await fs.writeFile(filePath, bom + header);
            } else {
                await fs.writeFile(filePath, '\ufeff'); // Just BOM for empty files
            }
        }

        return new StorageService(fullPath);
    }

    // Use this if resuming from an existing folder
    static async resume(executionDir: string): Promise<StorageService> {
        const service = new StorageService(executionDir);
        await service.loadExistingIds();
        return service;
    }

    async loadExistingIds(): Promise<void> {
        try {
            const content = await fs.readFile(path.join(this.executionDir, 'raw.csv'), 'utf8');
            const records = parse(content, { columns: true, bom: true });
            for (const row of records as any[]) {
                if (row.item_id) this.visitedIds.add(row.item_id);
            }
        } catch (e) {
            // If file is empty or corrupted, start fresh
            console.warn('Could not load existing IDs', e);
        }
    }

    hasVisitedId(id: string): boolean {
        return this.visitedIds.has(id);
    }

    async appendRawItem(item: MerItem): Promise<void> {
        if (this.visitedIds.has(item.item_id)) return; // Dedupe

        this.visitedIds.add(item.item_id);

        // Map item fields to header order
        const row = RAW_HEADER.map(key => {
            // @ts-ignore
            const val = item[key];
            return val === undefined || val === null ? '' : val;
        });

        const line = stringify([row]);
        await fs.appendFile(path.join(this.executionDir, 'raw.csv'), line);
    }

    async logError(url: string, error: string): Promise<void> {
        const line = `${new Date().toISOString()},"${url}","${error}"\n`;
        await fs.appendFile(path.join(this.executionDir, 'failed_urls.csv'), line);
    }

    getExecutionPath(): string {
        return this.executionDir;
    }
}
