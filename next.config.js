/** @type {import('next').NextConfig} */

let buildSha = 'dev';
try {
    buildSha = require('child_process').execSync('git rev-parse HEAD').toString().trim();
} catch (e) { console.warn('Git SHA not found'); }

const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    swcMinify: true,
    env: {
        NEXT_PUBLIC_BUILD_SHA: process.env.GITHUB_SHA || buildSha,
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    }
}

module.exports = nextConfig
