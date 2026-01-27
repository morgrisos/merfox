const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
    // Only apply to macOS
    if (context.electronPlatformName !== 'darwin') {
        return;
    }

    const appName = context.packager.appInfo.productFilename + '.app';
    const appPath = path.join(context.appOutDir, appName);

    if (fs.existsSync(appPath)) {
        console.log(`[afterPack] Detected macOS build. Force-applying Ad-Hoc signature to: ${appPath}`);
        try {
            // --force: replace any existing signature (including broken ones)
            // --deep: sign all nested frameworks and executables
            // --sign -: use ad-hoc signature
            execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
            console.log('[afterPack] Ad-Hoc signing completed successfully.');

            // Final verification check
            execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'inherit' });
            console.log('[afterPack] Signature verification passed.');
        } catch (e) {
            console.error('[afterPack] Signing or Verification failed.');
            throw e;
        }
    } else {
        console.warn(`[afterPack] App not found at ${appPath}, skipping signing.`);
    }
}
