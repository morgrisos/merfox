const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// CORS — required for Electron renderer (nodeIntegration: false)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'licenses.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || crypto.randomBytes(32).toString('hex');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('base64');
const LEASE_DURATION_HOURS = 72;

console.log('--- MerFox Lite License Server ---');
console.log(`ADMIN_API_KEY: ${ADMIN_API_KEY}`);
console.log(`JWT_SECRET: ${JWT_SECRET}`);
console.log(`Storage: ${DB_FILE}`);
console.log('---------------------------------');

// Database Helpers
function readDb() {
    if (!fs.existsSync(DB_FILE)) return { licenses: [], customers: [], subscriptions: [] };
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Routes
app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'merfox-license-server-lite', mode: 'temporary-friend-test' });
});

// Middleware: Admin Auth
const requireAdminKey = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    if (key !== ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
};

// Middleware: JWT Auth
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Missing token' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired lease token' });
        req.user = decoded;
        next();
    });
};

// POST /v1/admin/issue
app.post('/v1/admin/issue', requireAdminKey, (req, res) => {
    const { email, note, days = 30 } = req.body;
    const db = readDb();

    const licenseKey = `MERFOX-LITE-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const customerId = `cust_${crypto.randomBytes(8).toString('hex')}`;
    const subscriptionId = `sub_lite_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const newLicense = {
        id: `lic_${Date.now()}`,
        customerId,
        licenseKey,
        status: 'active',
        deviceId: null,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    db.licenses.push(newLicense);
    writeDb(db);

    res.json({
        ok: true,
        licenseKey,
        customerId,
        licenseId: newLicense.id,
        subscriptionId,
        currentPeriodEnd: expiresAt.toISOString(),
        days,
        note
    });
});

// POST /v1/activate
app.post('/v1/activate', (req, res) => {
    const { licenseKey, deviceId } = req.body;
    if (!licenseKey || !deviceId) return res.status(400).json({ error: 'Missing licenseKey or deviceId' });

    const db = readDb();
    const license = db.licenses.find(l => l.licenseKey === licenseKey);

    if (!license) return res.status(404).json({ error: 'License not found' });
    if (license.status !== 'active') return res.status(403).json({ error: 'License is not active' });

    // Check expiry
    if (new Date(license.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'License expired' });
    }

    // Device binding
    if (license.deviceId && license.deviceId !== deviceId) {
        return res.status(409).json({ error: 'Device limit reached (Max 1)' });
    }

    license.deviceId = deviceId;
    license.activatedAt = new Date().toISOString();
    license.lastSeenAt = new Date().toISOString();
    writeDb(db);

    // Issue lease token (72h)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + LEASE_DURATION_HOURS);

    const leaseToken = jwt.sign({
        licenseKey,
        deviceId,
        exp: Math.floor(expiresAt.getTime() / 1000)
    }, JWT_SECRET);

    res.json({
        ok: true,
        leaseToken,
        expiresAt: expiresAt.toISOString()
    });
});

// GET /v1/status
app.get('/v1/status', authenticateToken, (req, res) => {
    const { licenseKey } = req.user;
    const db = readDb();
    const license = db.licenses.find(l => l.licenseKey === licenseKey);

    if (!license || license.status !== 'active') {
        return res.json({ ok: false, subscriptionStatus: 'canceled' });
    }

    const isExpired = new Date(license.expiresAt) < new Date();
    
    res.json({
        ok: true,
        licenseStatus: license.status,
        subscriptionStatus: isExpired ? 'expired' : 'active',
        currentPeriodEnd: license.expiresAt
    });
});

// POST /v1/lease
app.post('/v1/lease', (req, res) => {
    const { licenseKey, deviceId } = req.body;
    const db = readDb();
    const license = db.licenses.find(l => l.licenseKey === licenseKey && l.deviceId === deviceId);

    if (!license || license.status !== 'active') {
        return res.status(403).json({ error: 'Invalid license or device' });
    }

    if (new Date(license.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'License expired' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + LEASE_DURATION_HOURS);

    const leaseToken = jwt.sign({
        licenseKey,
        deviceId,
        exp: Math.floor(expiresAt.getTime() / 1000)
    }, JWT_SECRET);

    res.json({
        ok: true,
        leaseToken,
        expiresAt: expiresAt.toISOString()
    });
});

// POST /v1/admin/device-reset
app.post('/v1/admin/device-reset', requireAdminKey, (req, res) => {
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ error: 'Missing licenseKey' });

    const db = readDb();
    const license = db.licenses.find(l => l.licenseKey === licenseKey);

    if (!license) return res.status(404).json({ error: 'License not found' });

    const prevDeviceId = license.deviceId;
    license.deviceId = null;
    license.activatedAt = null;
    writeDb(db);

    console.log(`[DEVICE_RESET] ${licenseKey} unbound (was: ${prevDeviceId})`);
    res.json({ ok: true, licenseKey, prevDeviceId, deviceId: null });
});

// GET /v1/admin/licenses
app.get('/v1/admin/licenses', requireAdminKey, (req, res) => {
    const db = readDb();
    res.json({ ok: true, count: db.licenses.length, licenses: db.licenses });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lite License Server running on http://0.0.0.0:${PORT}`);
});
