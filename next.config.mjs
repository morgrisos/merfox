/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export',
    images: {
        unoptimized: true,
    },
    // Ensure trailing slashes for electron file loading usually handled by hash router or just index.html
    // But standard export works if we load index.html
};

export default nextConfig;
