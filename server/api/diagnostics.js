const { execSync } = require('child_process');
const os = require('os');

module.exports = (req, res) => {
    try {
        const pid = process.pid;
        let binPath = 'unknown';

        try {
            binPath = execSync(
                `lsof -p ${pid} | grep -F ".app/Contents/MacOS/MerFox" || echo "not_in_packaged_app"`,
                { encoding: 'utf8', timeout: 2000 }
            ).toString().trim();
        } catch (e) {
            binPath = `Error: ${e.message}`;
        }

        let portStatus = 'unknown';
        try {
            portStatus = execSync(
                'lsof -nP -iTCP:13337 -sTCP:LISTEN || echo "not_listening"',
                { encoding: 'utf8', timeout: 2000 }
            ).toString().trim();
        } catch (e) {
            portStatus = `Error: ${e.message}`;
        }

        res.json({
            pid,
            binPath,
            portStatus,
            cwd: process.cwd(),
            version: require('../../package.json').version,
            env: process.env.NODE_ENV || 'production',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            hostname: os.hostname(),
            homedir: os.homedir(),
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
};
