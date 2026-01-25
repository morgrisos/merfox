/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    swcMinify: true,
    // Ensure we don't have weird directory issues
}

module.exports = nextConfig
