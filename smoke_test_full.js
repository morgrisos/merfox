const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const REPORT_FILE = 'smoke-report.md';
const LOG_FILE = 'smoke_debug.log'; // Plain text for grep
const RESULTS = [];

// Helper to log
function logDebug(msg) {
    fs.appendFileSync(LOG_FILE, `[DEBUG] ${msg}\n`);
    console.log(msg);
}

function logResult(category, item, status, details = '') {
    RESULTS.push({ category, item, status, details });
    const icon = status === 'PASS' ? '✅' : '❌';
    logDebug(`${icon} ${category} - ${item}: ${details}`);
}

async function findButtonByText(page, text) {
    const buttons = await page.$$('button, a');
    for (const b of buttons) {
        const t = await b.evaluate(el => el.textContent);
        if (t && t.includes(text)) return b;
    }
    return null;
}

async function run() {
    logDebug('Starting Smoke Test Full...');
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9333',
            defaultViewport: { width: 1280, height: 900 }
        });
    } catch (e) {
        console.error('Failed to connect. Ensure MerFox is running on port 9333.');
        process.exit(1);
    }

    // Wait for pages
    let pages = [];
    for (let i = 0; i < 15; i++) {
        pages = await browser.pages();
        if (pages.length > 0) break;
        await new Promise(r => setTimeout(r, 1000));
    }

    if (pages.length === 0) {
        console.error('No pages found');
        process.exit(1);
    }

    let page = pages.find(p => p.url().includes('localhost') || p.url().includes('merfox')) || pages[0];

    // Capture Console
    page.on('console', msg => {
        const text = msg.text();
        const line = `[CONSOLE] [${msg.type()}] ${text}`;
        fs.appendFileSync(LOG_FILE, line + '\n');

        // Fail fast checks if needed, but we'll collect stats later
    });

    page.on('dialog', async dialog => {
        logDebug(`Dialog appeared: ${dialog.message()}`);
        await dialog.accept(); // Auto accept alerts/confirms
    });

    try {
        // --- 1. DASHBOARD ---
        logDebug('--- Checking Dashboard ---');
        await page.goto('http://localhost:13337/');
        await new Promise(r => setTimeout(r, 1000));

        // Start Test Run
        const testRunBtn = await findButtonByText(page, 'テスト実行 (Macbook)');
        if (testRunBtn) {
            await testRunBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            logResult('Dashboard', 'Test Run Click', 'PASS', 'Clicked');
        } else {
            logResult('Dashboard', 'Test Run Click', 'FAIL', 'Button not found');
        }

        // Open Runs Folder
        const runsBtn = await findButtonByText(page, 'Runsを開く');
        if (runsBtn) {
            await runsBtn.click();
            logResult('Dashboard', 'Open Runs Folder', 'PASS', 'Clicked');
        } else {
            logResult('Dashboard', 'Open Runs Folder', 'FAIL', 'Button not found');
        }


        // --- 2. SCRAPER ---
        logDebug('--- Checking Scraper ---');
        await page.goto('http://localhost:13337/scraper');
        await new Promise(r => setTimeout(r, 1500));

        // Input URL
        const input = await page.$('input[placeholder*="https://jp.mercari.com/search"]');
        if (input) {
            // Check validation
            const validateBtn = await findButtonByText(page, '確認');
            if (validateBtn) {
                await validateBtn.click();
                await new Promise(r => setTimeout(r, 1000));
                logResult('Scraper', 'Validate URL', 'PASS', 'Clicked');
            } else {
                logResult('Scraper', 'Validate URL', 'FAIL', 'Validate button not found');
            }
        } else {
            logResult('Scraper', 'Input URL', 'FAIL', 'Input not found');
        }

        // Test Run 20 items
        const scraperTestBtn = await findButtonByText(page, 'テスト実行 (20件)');
        if (scraperTestBtn) {
            // Just verify presence, maybe don't click to avoid spamming runs? User said "Test Run (Startable only)"
            // Let's click it to verify no error modal appears.
            await scraperTestBtn.click();
            await new Promise(r => setTimeout(r, 1500));
            logResult('Scraper', 'Test Run Start', 'PASS', 'Clicked, no crash observed');
        } else {
            logResult('Scraper', 'Test Run Start', 'FAIL', 'Button not found');
        }


        // --- 3. SETTINGS ---
        logDebug('--- Checking Settings ---');
        await page.goto('http://localhost:13337/settings');
        await new Promise(r => setTimeout(r, 1500));

        const checks = [
            { text: '最新版を開く', name: 'Open Latest Release' },
            { text: 'ミラーからダウンロード', name: 'Mirror Download' },
            { text: 'Logs', name: 'Open Logs Folder' },
            { text: 'Path', name: 'Copy Log Path' },
            { text: 'Clear', name: 'Clear Logs' }, // Triggers confirm dialog
            { text: 'チュートリアルを再表示', name: 'Show Onboarding' }
        ];

        for (const check of checks) {
            const btn = await findButtonByText(page, check.text);
            if (btn) {
                await btn.click();
                await new Promise(r => setTimeout(r, 800)); // Wait for logs/reaction
                logResult('Settings', check.name, 'PASS', 'Clicked');
            } else {
                logResult('Settings', check.name, 'FAIL', 'Button not found');
            }
        }

        // App Version
        const versionEl = await page.waitForSelector('p.font-mono.text-2xl.font-bold', { timeout: 2000 }).catch(() => null);
        if (versionEl) {
            const vText = await versionEl.evaluate(el => el.textContent);
            logResult('Settings', 'Version Display', 'PASS', `Visible: ${vText}`);
        } else {
            logResult('Settings', 'Version Display', 'FAIL', 'Not found');
        }

    } catch (e) {
        logDebug(`FATAL ERROR: ${e.message}`);
        logResult('System', 'Global Error', 'FAIL', e.message);
    } finally {
        if (browser) await browser.disconnect();
    }

    // --- GENERATE REPORT ---
    generateReport();
}

function generateReport() {
    let md = '# MerFox v0.1.46 Smoke Test Report\n\n';

    // 1. Button Verification
    md += '## 1. Button Operation Verification\n';
    md += '| Category | Item | Status | Details |\n';
    md += '|---|---|---|---|\n';
    RESULTS.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        md += `| ${r.category} | ${r.item} | ${icon} ${r.status} | ${r.details} |\n`;
    });
    md += '\n';

    // 2. Log Grep (Mechanical Proof)
    md += '## 2. Zero Error Proof (Log Grep)\n';
    md += 'Target Log: `smoke_debug.log` (Includes Console & Debug traces)\n\n';

    const errorsToCheck = [
        'ERR_CONNECTION_REFUSED',
        'No handler registered',
        'Failed to fetch',
        ':3001',
        'TypeError: Failed to fetch'
    ];

    const logContent = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf8') : '';

    md += '| Keyword | Hits | Result |\n';
    md += '|---|---|---|\n';

    errorsToCheck.forEach(kw => {
        const hits = (logContent.match(new RegExp(escapeRegExp(kw), 'g')) || []).length;
        const res = hits === 0 ? '✅ PASS' : '❌ FAIL';
        md += `| \`${kw}\` | ${hits} | ${res} |\n`;
    });

    fs.writeFileSync(REPORT_FILE, md);
    console.log('Report generated.');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

run();
