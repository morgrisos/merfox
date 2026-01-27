import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Building Server Bundle...');

esbuild.build({
    entryPoints: [path.resolve(__dirname, '../server/index.js')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.resolve(__dirname, '../server/dist/index.cjs'),
    external: ['electron', 'chromium-bidi', 'playwright', 'playwright-core'], // Exclude electron and playwright
    loader: { '.html': 'text' },
    format: 'cjs', // Ensure output is CJS for simplicity in 'fork' (Node default) or ESM? 
    // Node CJS loader is default, but project is ESM. 
    // If we bundle to CJS, we can run it with node. 
    // If we bundle to ESM, we need type:module in package.json (which we have).
    // Safest for 'fork' is CJS if we don't want to worry about import.meta.
    // However server code uses 'require' internally (it was CJS).
    // Wait, server/index.js uses `require` (checked in previous turns).
    // So input is CJS. Output should be CJS.
}).then(() => {
    console.log('Server Bundle Created: server/dist/index.js');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
