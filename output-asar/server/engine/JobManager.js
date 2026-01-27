const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class JobManager {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.filePath = path.join(dataDir, 'watch_jobs.json');
        this.jobs = []; // In-memory cache

        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                this.jobs = JSON.parse(data);
                console.log(`[JobManager] Loaded ${this.jobs.length} jobs.`);
            } else {
                this.jobs = [];
                this.save(); // Initialize empty file
            }
        } catch (e) {
            console.error('[JobManager] Failed to load jobs:', e);
            this.jobs = [];
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.jobs, null, 2));
        } catch (e) {
            console.error('[JobManager] Failed to save jobs:', e);
        }
    }

    getAll() {
        return this.jobs;
    }

    getById(id) {
        return this.jobs.find(j => j.id === id);
    }

    createJob(targetUrl, options = {}) {
        const now = new Date().toISOString();
        const safeInterval = Math.min(Math.max(options.intervalMinutes || 25, 5), 60); // Clamp 5-60

        const newJob = {
            id: crypto.randomUUID(),
            name: options.name || `Auto: ${targetUrl.slice(0, 30)}...`,
            targetUrl: targetUrl,
            intervalMinutes: safeInterval,
            isEnabled: true, // Auto-enable on create

            createdAt: now,
            updatedAt: now,
            lastRunAt: null,
            nextRunAt: now, // Due immediately

            lastSeenItemId: null,
            seenHistory: [], // [P2.0] Ring Buffer for robust diffing

            config: {
                dailyLimit: 1000,
                maxPriceYen: 100000,
                excludeShops: true,
                excludeUnknown: true,
                stopConditions: {
                    maxItems: 50 // Per run fetch limit
                },
                ...options.config // Override if needed
            },

            stats: {
                totalRuns: 0,
                totalItemsFound: 0
            }
        };

        this.jobs.push(newJob);
        this.save();
        console.log(`[JobManager] Created job: ${newJob.id}`);
        return newJob;
    }

    updateJob(id, updates) {
        const index = this.jobs.findIndex(j => j.id === id);
        if (index === -1) return null;

        const job = this.jobs[index];
        const updatedJob = {
            ...job,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.jobs[index] = updatedJob;
        this.save();
        return updatedJob;
    }

    // [P2.0] Ring Buffer Update Helper
    updateSeenHistory(id, newItemIds) {
        const index = this.jobs.findIndex(j => j.id === id);
        if (index === -1) return null;

        const job = this.jobs[index];
        const HISTORY_SIZE = 50;

        // Prepend new items
        // Filter duplicates just in case
        const uniqueNew = newItemIds.filter(id => !job.seenHistory.includes(id));
        const newHistory = [...uniqueNew, ...job.seenHistory].slice(0, HISTORY_SIZE);

        job.seenHistory = newHistory;
        if (newHistory.length > 0) {
            job.lastSeenItemId = newHistory[0];
        }

        job.updatedAt = new Date().toISOString();
        this.save();
    }

    deleteJob(id) {
        const initialLength = this.jobs.length;
        this.jobs = this.jobs.filter(j => j.id !== id);
        if (this.jobs.length !== initialLength) {
            this.save();
            return true;
        }
        return false;
    }

    getDueJobs() {
        const now = new Date();
        return this.jobs.filter(job => {
            if (!job.isEnabled) return false;
            // If never run, it's due
            if (!job.nextRunAt) return true;
            return new Date(job.nextRunAt) <= now;
        });
    }
}

module.exports = { JobManager };
