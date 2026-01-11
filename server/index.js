const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Scraper } = require('./engine/Scraper');
const { JobManager } = require('./engine/JobManager');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Storage setup
const storageDir = path.resolve(__dirname, 'storage');
const runsDir = process.env.MERFOX_RUNS_DIR
    ? path.resolve(process.env.MERFOX_RUNS_DIR)
    : path.resolve(__dirname, 'runs');
const dataDir = path.resolve(__dirname, 'data');

const jobManager = new JobManager(dataDir);

console.log('--- SERVER STARTUP DIAGNOSTICS ---');
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);
console.log('RUNS_DIR:', runsDir);
console.log('----------------------------------');

if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
if (!fs.existsSync(runsDir)) fs.mkdirSync(runsDir, { recursive: true });

app.use(cors());
app.use(bodyParser.json());
app.use('/api/storage', express.static(storageDir));

// Helper to find run dir
const getRunDir = (runId) => {
    const entries = fs.readdirSync(runsDir, { withFileTypes: true });
    const dir = entries.find(e => e.isDirectory() && e.name.endsWith(runId));
    return dir ? path.join(runsDir, dir.name) : null;
};

// DOWNLOAD API
app.get('/api/runs/:runId/files/:type', (req, res) => {
    const { runId, type } = req.params;
    const runDir = getRunDir(runId);

    if (!runDir) return res.status(404).send('Run directory not found');

    let filename, safeName;
    const datePrefix = path.basename(runDir).split('_')[0].replace(/-/g, ''); // 20260110

    switch (type) {
        case 'raw':
            filename = 'raw.csv';
            safeName = `merfox_raw_${datePrefix}_${runId}.csv`;
            break;
        case 'log':
            filename = 'run.log';
            safeName = `merfox_log_${datePrefix}_${runId}.log`;
            break;
        case 'amazon':
            filename = 'amazon_upload.tsv';
            safeName = `merfox_amazon_${datePrefix}_${runId}.tsv`;
            break;
        case 'failed':
            filename = 'convert_failed.csv';
            safeName = `merfox_failed_${datePrefix}_${runId}.csv`;
            break;
        default: return res.status(400).send('Invalid file type');
    }

    const filePath = path.join(runDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    res.download(filePath, safeName, (err) => {
        if (err) console.error('Download error:', err);
    });
});

// REVEAL IN FINDER API
const { exec } = require('child_process');
app.post('/api/runs/:runId/reveal', (req, res) => {
    const { runId } = req.params;
    const runDir = getRunDir(runId);

    if (!runDir) return res.status(404).json({ error: 'Run directory not found' });

    // Platform specific open
    const cmd = process.platform === 'darwin' ? `open -R "${runDir}"` :
        process.platform === 'win32' ? `explorer "${runDir}"` :
            `xdg-open "${runDir}"`;

    exec(cmd, (error) => {
        if (error) {
            console.error('Reveal error:', error);
            return res.status(500).json({ error: 'Failed to reveal' });
        }
        res.json({ success: true, path: runDir });
    });
});

// GET RUN DIR PATH
app.get('/api/runs/:runId/path', (req, res) => {
    const { runId } = req.params;
    const runDir = getRunDir(runId);
    if (!runDir) return res.status(404).json({ error: 'Run directory not found' });
    res.json({ path: runDir });
});

// Store active runs
const activeRuns = new Map(); // runId -> { scraper: ScraperInstance, clients: Response[] }

app.get('/', (req, res) => {
    res.send('MerFox Local Engine is Running');
});

// START Run
app.post('/api/run/start', (req, res) => {
    const { runId, mode, targetUrl, config } = req.body;

    if (activeRuns.has(runId)) {
        return res.status(400).json({ error: 'Run ID already exists' });
    }

    console.log(`Starting run: ${runId}`);

    const scraper = new Scraper(runId, mode, targetUrl, config);
    activeRuns.set(runId, { scraper, clients: [] });

    // Start scraping asynchronously
    try {
        scraper.start().then(() => {
            console.log(`Run ${runId} completed.`);
            // Clean up: optional auto-removal logic here
        }).catch(err => {
            console.error(`Run ${runId} failed:`, err);
        });

        res.json({ success: true, runId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// STOP Run
app.post('/api/run/stop', (req, res) => {
    const { runId } = req.body;
    const run = activeRuns.get(runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    run.scraper.stop();
    res.json({ success: true });
});

// WATCH JOBS API (P2.1)
app.get('/api/watch/jobs', (req, res) => {
    res.json(jobManager.getAll());
});

app.post('/api/watch/jobs', (req, res) => {
    const { targetUrl, name, intervalMinutes } = req.body;
    if (!targetUrl) return res.status(400).json({ error: 'targetUrl is required' });

    // Explicitly pass intervalMinutes for flexibility
    const job = jobManager.createJob(targetUrl, { name, intervalMinutes });
    res.json(job);
});

app.post('/api/watch/jobs/:id/enable', (req, res) => {
    const job = jobManager.updateJob(req.params.id, { isEnabled: true });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

app.post('/api/watch/jobs/:id/disable', (req, res) => {
    const job = jobManager.updateJob(req.params.id, { isEnabled: false });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

app.delete('/api/watch/jobs/:id', (req, res) => {
    const success = jobManager.deleteJob(req.params.id);
    if (!success) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true });
});

// STREAM Events (SSE)
app.get('/api/run/stream', (req, res) => {
    const { runId } = req.query;
    const run = activeRuns.get(runId);

    if (!run) {
        return res.status(404).end('Run not found');
    }

    // SSE Setup
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Add this client to the run
    run.clients.push(res);

    // Initial connection confirmed
    sendEvent('connected', { runId });

    // Listen to scraper events and forward to SSE
    const onLog = (data) => sendEvent('log', data);
    const onProgress = (data) => sendEvent('progress', data);
    const onStats = (data) => sendEvent('stats', data);
    const onDone = (data) => {
        sendEvent('done', data);
        res.end(); // Close connection on done
    };

    run.scraper.on('log', onLog);
    run.scraper.on('progress', onProgress);
    run.scraper.on('stats', onStats);
    run.scraper.on('done', onDone);

    // Clean up on disconnect
    req.on('close', () => {
        run.scraper.off('log', onLog);
        run.scraper.off('progress', onProgress);
        run.scraper.off('stats', onStats);
        run.scraper.off('done', onDone);
        run.clients = run.clients.filter(c => c !== res);
    });
});

// --- P2.2 SCHEDULER LOOP ---
setInterval(() => {
    // console.log('[Scheduler] Checking due jobs...');
    const dueJobs = jobManager.getDueJobs();

    dueJobs.forEach(job => {
        // Prevent overlap (Simple Global Lock per Job ID)
        // Check if any active run belongs to this job
        // MVP: Using runId prefix "watch_<jobId>_"
        const isRunning = Array.from(activeRuns.keys()).some(k => k.startsWith(`watch_${job.id}_`));

        if (isRunning) {
            console.log(`[Scheduler] Job ${job.id} skipped (Already running)`);
            return;
        }

        console.log(`[Scheduler] Job ${job.id} is due. Starting...`);
        const runId = `watch_${job.id}_${Date.now()}`;

        // Prepare Config with Diff Logic params
        const runConfig = {
            ...job.config,
            lastSeenItemId: job.lastSeenItemId,
            seenHistory: job.seenHistory || []
        };

        const scraper = new Scraper(runId, 'watch', job.targetUrl, runConfig);
        activeRuns.set(runId, { scraper, clients: [] });

        // Update Job Timestamps IMMEDIATELY to prevent double firing
        jobManager.updateJob(job.id, {
            lastRunAt: new Date().toISOString(),
            nextRunAt: new Date(Date.now() + job.intervalMinutes * 60 * 1000).toISOString(),
            stats: {
                ...job.stats,
                totalRuns: (job.stats?.totalRuns || 0) + 1
            }
        });

        scraper.start().then(() => {
            console.log(`[Scheduler] Job ${job.id} (Run ${runId}) finished.`);
            activeRuns.delete(runId);
        }).catch(err => {
            console.error(`[Scheduler] Job ${job.id} (Run ${runId}) failed:`, err);
            activeRuns.delete(runId);
        });

        // Hook for Done -> Update Diff logic
        scraper.on('done', (data) => {
            if (data.success && data.newItemIds && data.newItemIds.length > 0) {
                console.log(`[Scheduler] Job ${job.id} found ${data.newItemIds.length} new items. Updating history.`);
                jobManager.updateSeenHistory(job.id, data.newItemIds);
            }
        });

    });

}, 60 * 1000); // Check every 60s

app.listen(PORT, () => {
    console.log(`MerFox Local Engine listening on port ${PORT}`);
});
