import { machineId } from 'node-machine-id';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Reuse logic from runUtils (or similar) to ensure persistent storage
function getUserDataDir() {
    if (process.env.MERFOX_USER_DATA) return process.env.MERFOX_USER_DATA;
    if (process.env.NODE_ENV === 'development') return path.join(process.cwd(), 'runs_dev'); // Fallback dev
    return path.join(os.homedir(), 'Library/Application Support/merfox/MerFox');
}

const LICENSE_FILE = path.join(getUserDataDir(), 'license.json');

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'DEVICE_LIMIT' | 'OFFLINE_GRACE' | 'UNAUTHENTICATED';

export interface LicenseData {
    key: string;
    accessToken: string;
    refreshToken: string;
    lastOnlineAt: number;
    deviceId: string;
}

export class LicenseService {
    private static instance: LicenseService;
    private data: LicenseData | null = null;
    private deviceId: string = '';

    private constructor() { }

    public static getInstance(): LicenseService {
        if (!LicenseService.instance) {
            LicenseService.instance = new LicenseService();
        }
        return LicenseService.instance;
    }

    public async init(): Promise<void> {
        // 1. Get Stable Device ID
        try {
            this.deviceId = await machineId();
        } catch (e) {
            console.error('[License] Failed to get machine ID, falling back to random (dev mode)', e);
            this.deviceId = 'fallback-' + Math.random().toString(36).substring(7);
        }

        // 2. Load Local Data
        try {
            const raw = await fs.readFile(LICENSE_FILE, 'utf8');
            this.data = JSON.parse(raw);
        } catch {
            this.data = null;
        }
    }

    public getStatus(): LicenseStatus {
        if (!this.data || !this.data.accessToken) return 'UNAUTHENTICATED';

        const now = Date.now();
        const diffHours = (now - this.data.lastOnlineAt) / (1000 * 60 * 60);

        // 72 Hours Offline Grace Period
        if (diffHours > 72) {
            return 'OFFLINE_GRACE'; // Or EXPIRED if completely locked
        }

        return 'ACTIVE';
    }

    public async activate(key: string): Promise<{ success: boolean; message?: string }> {
        if (!this.deviceId) await this.init();

        try {
            // Call Backend (Mocked for now)
            const res = await fetch('http://localhost:13337/api/license/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, deviceId: this.deviceId })
            });
            const json = await res.json();

            if (!res.ok) {
                return { success: false, message: json.error || 'Activation failed' };
            }

            // Save Data
            this.data = {
                key,
                accessToken: json.accessToken,
                refreshToken: json.refreshToken,
                lastOnlineAt: Date.now(),
                deviceId: this.deviceId
            };
            await this.save();
            return { success: true };

        } catch (e) {
            return { success: false, message: 'Network error or server unreachable' };
        }
    }

    public async refresh(): Promise<boolean> {
        if (!this.data) return false;

        try {
            const res = await fetch('http://localhost:13337/api/license/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.data.refreshToken, deviceId: this.deviceId })
            });

            if (res.ok) {
                const json = await res.json();
                this.data.accessToken = json.accessToken;
                this.data.lastOnlineAt = Date.now();
                await this.save();
                return true;
            } else {
                return false; // Refresh failed (Suspended/Invalid)
            }
        } catch {
            return false; // Network fail, keep existing status if within grace
        }
    }

    public async deactivate(): Promise<void> {
        if (this.data) {
            try {
                await fetch('http://localhost:13337/api/license/deactivate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: this.data.key, deviceId: this.deviceId })
                });
            } catch { } // Ignore error
        }
        this.data = null;
        await fs.unlink(LICENSE_FILE).catch(() => { });
    }

    private async save() {
        if (!this.data) return;
        await fs.mkdir(path.dirname(LICENSE_FILE), { recursive: true });
        await fs.writeFile(LICENSE_FILE, JSON.stringify(this.data, null, 2));
    }
}
