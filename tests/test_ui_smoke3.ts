import { chromium } from 'playwright';

async function main() {
    console.log('Connecting to MerFox browser on port 9223...');
    let browser;
    try {
        browser = await chromium.connectOverCDP('http://localhost:9223');
        const contexts = browser.contexts();
        const pages = contexts.map((c) => c.pages()).flat();

        let appPage = pages.find(p => p.url().includes('13337'));
        if (!appPage) {
            console.log("Could not find app page. Picking first page.");
            appPage = pages[0];
        }

        console.log(`Using page: ${appPage.url()}`);

        console.log('--- Navigating to Settings ---');
        await appPage.goto('http://localhost:13337/settings');
        await appPage.waitForTimeout(2000);
        let text = await appPage.evaluate(() => document.body.innerText);
        console.log("SETTINGS TEXT:");
        console.log("------------------------");
        console.log(text.substring(0, 1500));
        console.log("------------------------");

        console.log('--- Navigating to Dashboard ---');
        await appPage.goto('http://localhost:13337/dashboard');
        await appPage.waitForTimeout(2000);
        text = await appPage.evaluate(() => document.body.innerText);
        console.log("DASHBOARD TEXT:");
        console.log("------------------------");
        console.log(text.substring(0, 1500));
        console.log("------------------------");

        console.log('--- Navigating to Step 5 ---');
        await appPage.goto('http://localhost:13337/wizard/step5');
        await appPage.waitForTimeout(3000);
        text = await appPage.evaluate(() => document.body.innerText);
        console.log("STEP 5 TEXT:");
        console.log("------------------------");
        console.log(text.substring(0, 1500));
        console.log("------------------------");

        await browser.close();

    } catch (e) {
        console.error('Test failed:', e);
        if (browser) await browser.close();
    }
}

main();
