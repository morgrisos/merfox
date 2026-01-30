import fs from 'fs';
import path from 'path';
import os from 'os';

function appendDebug(line: string) {
    try {
        const home = os.homedir();
        const p = path.join(home, 'Library/Application Support/merfox/merfox-license.debug.log');
        fs.appendFileSync(p, line + '\n');
    } catch (_) { }
}

import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory "Database" for Mocking
// Real implementation would use Prisma/Supabase
const VALID_KEYS = new Set(['VALID_KEY', 'TEST_KEY_123']);
const SUSPENDED_KEYS = new Set(['SUSPENDED_KEY', 'BAD_PAYMENT']);
const DEVICE_MAP = new Map<string, Set<string>>(); // Key -> Set<DeviceId>

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    appendDebug(JSON.stringify({
        t: new Date().toISOString(),
        method: req.method,
        url: req.url,
        action: req.query?.action,
        body: req.body
    }));

    // [DEV GATE] Robust Check
    const devKeyEnv = process.env.MERFOX_DEV_KEY || "";
    // Check various possible key fields UI might send
    const inputKey = (req.body?.key || req.body?.licenseKey || req.body?.license || "").toString();

    const isDevBypass = devKeyEnv && inputKey && inputKey === devKeyEnv;

    if (isDevBypass) {
        const out = {
            accessToken: 'dev_access_' + Date.now(),
            refreshToken: 'dev_refresh_' + inputKey,
            ok: true,
            devBypass: true,
            status: 'active' // Some UIs look for status
        };
        appendDebug(JSON.stringify({ t: new Date().toISOString(), resp: out }));
        return res.status(200).json(out);
    }

    const { action } = req.query;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { key, deviceId, refreshToken } = req.body;

    // --- ACTIVATE ---
    if (action === 'activate') {
        // Old bypass removed in favor of top-level check


        if (!key || !deviceId) return res.status(400).json({ error: 'Missing key or deviceId' });

        if (SUSPENDED_KEYS.has(key)) return res.status(403).json({ error: 'License is SUSPENDED (Payment Failed)' });
        if (!VALID_KEYS.has(key)) return res.status(404).json({ error: 'Invalid License Key' });

        // Device Limit Check (Max 1)
        const currentDevices = DEVICE_MAP.get(key) || new Set();
        if (currentDevices.size >= 1 && !currentDevices.has(deviceId)) {
            return res.status(409).json({ error: 'Device limit reached (Max 1). Please deactivate other devices.' });
        }

        // Register Device
        currentDevices.add(deviceId);
        DEVICE_MAP.set(key, currentDevices);

        return res.status(200).json({
            accessToken: 'mock_access_' + Date.now(),
            refreshToken: 'mock_refresh_' + key
        });
    }

    // --- REFRESH ---
    if (action === 'refresh') {
        if (!refreshToken) return res.status(400).json({ error: 'Missing token' });

        // Check if underlying key is suspended (Simulated by token structure)
        if (refreshToken.includes('SUSPENDED')) {
            return res.status(403).json({ error: 'License Suspended' });
        }

        return res.status(200).json({
            accessToken: 'mock_access_refreshed_' + Date.now()
        });
    }

    // --- DEACTIVATE ---
    if (action === 'deactivate') {
        if (!key || !deviceId) return res.status(400).json({ error: 'Missing info' });

        const devices = DEVICE_MAP.get(key);
        if (devices) {
            devices.delete(deviceId);
        }
        return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Unknown action' });
}
