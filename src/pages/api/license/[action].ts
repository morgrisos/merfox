import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory "Database" for Mocking
// Real implementation would use Prisma/Supabase
const VALID_KEYS = new Set(['VALID_KEY', 'TEST_KEY_123']);
const SUSPENDED_KEYS = new Set(['SUSPENDED_KEY', 'BAD_PAYMENT']);
const DEVICE_MAP = new Map<string, Set<string>>(); // Key -> Set<DeviceId>

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const { action } = req.query;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { key, deviceId, refreshToken } = req.body;

    // --- ACTIVATE ---
    if (action === 'activate') {

        // [DEV GATE] Allow specific dev key for testing/verification
        const devKeyEnv = process.env.MERFOX_DEV_KEY;
        const isDevBypass = devKeyEnv && key === devKeyEnv && devKeyEnv === 'MER-DEV-0000';

        if (isDevBypass) {
            return res.status(200).json({
                accessToken: 'dev_access_' + Date.now(),
                refreshToken: 'dev_refresh_' + key
            });
        }

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
