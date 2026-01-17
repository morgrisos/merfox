const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const REPORT_FILE = 'smoke-report.md';
const SCREENSHOT_DIR = 'smoke-screenshots';
const RESULTS = [];

async function logResult(name, status, details = '') {
    RESULTS.push({ name, status, details });
    console.log(`[${status}] ${name} ${details}`);
}

async function run() {
    console.log('Connecting to MerFox...');
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9333',
            defaultViewport: { width: 1200, height: 800 }
        });
    } catch (e) {
        console.error('Failed to connect:', e);
        process.exit(1);
    }

    // Wait for pages
    let pages = [];
    for (let i = 0; i < 10; i++) {
        pages = await browser.pages();
        if (pages.length > 0) break;
        await new Promise(r => setTimeout(r, 1000));
    }

    if (pages.length === 0) {
        console.error('No pages found after 10s');
        process.exit(1);
    }

    // Filter background pages if any
    const page = pages.find(p => p.url().includes('localhost') || p.url().includes('merfox')) || pages[0];
    console.log('Connected to page:', await page.title(), page.url());

    // Reset to Dashboard
    await page.goto('http://localhost:13337/');
    await page.waitForSelector('h1');

    // Enable Console Log Capture
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push({ type: msg.type(), text });
        if (text.includes('3001') || text.includes('ERR_CONNECTION_REFUSED')) {
            logResult('Console Check', 'FAIL', `Found 3001/Connection Refused: ${text}`);
        }
    });

    // Screenshot Helper
    const takeScreenshot = async (name) => {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
    };

    try {
        // --- DASHBOARD CHECK ---
        console.log('--- DASHBOARD TEST ---');
        await page.waitForSelector('h1'); // Start screen
        await takeScreenshot('01_dashboard_initial');

        // Check for 3001 errors in initial load
        if (consoleLogs.some(l => l.text.includes('3001'))) {
            logResult('Dashboard 3001 Check', 'FAIL', 'Found 3001 error logs');
        } else {
            logResult('Dashboard 3001 Check', 'PASS', 'No 3001 errors observed');
        }

        // Click "Test Run (Macbook)"
        // Note: Button text might vary, looking for 'テスト実行'
        const buttons = await page.$$('button');
        let testRunBtn;
        for (const b of buttons) {
            const txt = await b.evaluate(el => el.textContent);
            if (txt.includes('テスト実行')) testRunBtn = b;
        }

        if (testRunBtn) {
            await testRunBtn.click();
            await new Promise(r => setTimeout(r, 2000)); // Wait for mock run
            await takeScreenshot('02_dashboard_testrun');
            logResult('Dashboard Test Run', 'PASS', 'Button clicked');
        } else {
            logResult('Dashboard Test Run', 'FAIL', 'Button not found');
        }

        // --- NAVIGATE TO SETTINGS ---
        // Assuming Sidebar navigation. Need to find selector.
        // Usually href="/settings" or similar.
        const settingsLink = await page.$('a[href="/settings"]');
        if (settingsLink) {
            await settingsLink.click();
            await page.waitForSelector('h2'); // "抽出設定"
            await takeScreenshot('03_settings_page');
            logResult('Nav to Settings', 'PASS');
        } else {
            // Try searching text "Settings" or icon
            logResult('Nav to Settings', 'FAIL', 'Link not found');
            return;
        }

        // --- SETTINGS CHECK ---
        console.log('--- SETTINGS TEST ---');

        // 1. Mirror Download Button
        // Loop buttons again
        const settingsButtons = await page.$$('button');
        let mirrorBtn, logsBtn, clearLogsBtn, latestReleaseBtn;

        for (const b of settingsButtons) {
            const txt = await b.evaluate(el => el.textContent);
            if (txt.includes('ミラーからダウンロード')) mirrorBtn = b;
            if (txt.includes('Logs')) logsBtn = b;
            if (txt.includes('Clear')) clearLogsBtn = b;
            if (txt.includes('最新版を開く')) latestReleaseBtn = b;
        }

        if (mirrorBtn) {
            await mirrorBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            // Check logs for "[settings] mirror clicked"
            const clickedLog = consoleLogs.find(l => l.text.includes('mirror clicked'));
            if (clickedLog) {
                logResult('Settings Mirror Button', 'PASS', `Log found`);
            } else {
                logResult('Settings Mirror Button', 'FAIL', 'Click log NOT found');
            }
        } else {
            console.log('Buttons found:', await Promise.all(settingsButtons.map(b => b.evaluate(el => el.textContent))));
            logResult('Settings Mirror Button', 'FAIL', 'Button not found - see console');
        }

        // 2. Open Logs
        if (logsBtn) {
            await logsBtn.click();
            logResult('Settings Open Logs', 'PASS', 'Clicked');
        } else {
            logResult('Settings Open Logs', 'FAIL', 'Button not found');
        }

        // 3. Latest Release
        if (latestReleaseBtn) {
            await latestReleaseBtn.click();
            logResult('Settings Latest Release', 'PASS', 'Clicked');
        } else {
            logResult('Settings Latest Release', 'FAIL', 'Button not found');
        }

        await takeScreenshot('04_settings_interacted');

    } catch (e) {
        logResult('Execution Error', 'FAIL', e.message);
        console.error(e);
    } finally {
        if (browser) await browser.disconnect();
    }

    // Write Report
    let markdown = '# Smoke Test Report (v0.1.46)\n\n| Item | Status | Details |\n|---|---|---|\n';
    RESULTS.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        markdown += `| ${r.name} | ${icon} ${r.status} | ${r.details} |\n`;
    });

    markdown += '\n## Console Logs (Errors/Warns)\n```\n';
    consoleLogs.filter(l => l.type === 'error' || l.type === 'warning' || l.text.includes('INFO:')).forEach(l => {
        markdown += `[${l.type}] ${l.text}\n`;
    });
    markdown += '```\n';

    fs.writeFileSync(REPORT_FILE, markdown);
    fs.writeFileSync('smoke_logs.json', JSON.stringify(consoleLogs, null, 2));
    console.log('Report generated at ' + REPORT_FILE);
}

run();
