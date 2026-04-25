import { chromium } from 'playwright';

async function main() {
    console.log('Connecting to existing browser on port 9222...');
    let browser;
    try {
        browser = await chromium.connectOverCDP('http://localhost:9222');
        const contexts = browser.contexts();
        const pages = contexts.map((c) => c.pages()).flat();

        let appPage = pages.find(p => p.url().includes('50864'));
        if (!appPage) {
            console.log("Could not find app page. Picking first page.");
            appPage = pages[0];
            await appPage.goto('http://127.0.0.1:50864/');
            await appPage.waitForLoadState('networkidle');
        }

        console.log('--- Navigating to Settings ---');
        await appPage.goto('http://127.0.0.1:50864/settings');
        await appPage.waitForTimeout(1000);

        // Find version string (usually displayed next to MerFox logo or at bottom)
        const versionEl = await appPage.getByText(/v0\.1\.\d+/).first();
        if (await versionEl.isVisible()) {
            console.log(`Version found: ${await versionEl.textContent()}`);
        } else {
            console.log('Version element not found immediately. Dumping text content:');
            const pageText = await appPage.evaluate(() => document.body.innerText);
            const match = pageText.match(/v0\.1\.\d+/);
            console.log(`Version extracted via text: ${match?.[0]}`);
        }

        console.log('--- Navigating to Dashboard ---');
        await appPage.goto('http://127.0.0.1:50864/');
        await appPage.waitForTimeout(1000);

        // Check for Open Folder button
        const folderBtns = await appPage.getByRole('button', { name: /Open Folder/i }).all();
        console.log(`Found ${folderBtns.length} Open Folder buttons`);
        if (folderBtns.length === 0) {
            const pageText = await appPage.evaluate(() => document.body.innerText);
            if (pageText.includes('Open Folder')) console.log('Open Folder text exists but is not a button');
        }

        console.log('--- Navigating to Step 5 ---');
        await appPage.goto('http://127.0.0.1:50864/wizard/step5');
        await appPage.waitForTimeout(2000); // give time for IPC load

        const condVal = await appPage.locator('select').first().inputValue();
        const daysVal = await appPage.locator('select').nth(1).inputValue();

        console.log(`Restored Condition: ${condVal}`);
        console.log(`Restored Leadtime: ${daysVal}`);

        await browser.close();

    } catch (e) {
        console.error('Test failed:', e);
        if (browser) await browser.close();
    }
}

main();
