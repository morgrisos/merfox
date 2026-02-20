import { machineId } from 'node-machine-id';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// License Server URL from environment
const LICENSE_SERVER_URL = process.env.NEXT_PUBLIC_LICENSE_SERVER_URL || 'http://localhost:3001';

// Reuse logic from runUtils (or similar) to ensure persistent storage
function getUserDataDir() {
    if (process.env.MERFOX_USER_DATA) return process.env.MERFOX_USER_DATA;
    if (process.env.NODE_ENV === 'development') return path.join(process.cwd(), 'runs_dev');
    return path.join(os.homedir(), 'Library/Application Support/merfox/MerFox');
}

const LICENSE_FILE = path.join(getUserDataDir(), 'license.json');

export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'DEVICE_LIMIT' | 'OFFLINE_GRACE' | 'UNAUTHENTICATED';

export interface LicenseData {
    key: string;
    leaseToken: string; // JWT from license server
    leaseExpiresAt: number; // Unix timestamp (milliseconds)
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
            console.log('[License] Loaded license.json:', { key: this.data?.key, expiresAt: this.data ? new Date(this.data.leaseExpiresAt) : 'unknown' });
        } catch {
            this.data = null;
            console.log('[License] No license.json found');
        }
    }

    public getStatus(): LicenseStatus {
        if (!this.data || !this.data.leaseToken) return 'UNAUTHENTICATED';

        const now = Date.now();

        // Check if Lease Token has expired
        if (now > this.data.leaseExpiresAt) {
            return 'EXPIRED';
        }

        // Check if within online grace period (72 hours from last online check)
        const diffHours = (now - this.data.lastOnlineAt) / (1000 * 60 * 60);
        if (diffHours > 72) {
            return 'OFFLINE_GRACE';
        }

        return 'ACTIVE';
    }

    public getDeviceId(): string {
        return this.deviceId;
    }

    public getLeaseToken(): string | null {
        return this.data?.leaseToken || null;
    }

    /**
     * Verify online license status by calling /v1/status
     * Returns { ok: true/false, status: 'active'/'inactive', message?: string }
     */
    public async verifyOnline(): Promise<{ ok: boolean; status: string; message?: string; licenseStatus?: string; subscriptionStatus?: string }> {
        if (!this.data || !this.data.leaseToken) {
            return { ok: false, status: 'unauthenticated', message: 'No lease token' };
        }

        try {
            console.log('[License] Verifying online status...', LICENSE_SERVER_URL);
            const res = await fetch(`${LICENSE_SERVER_URL}/v1/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.data.leaseToken}`
                }
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                return { ok: false, status: 'error', message: json.error || `HTTP ${res.status}` };
            }

            const json = await res.json();
            console.log('[License] Online verification response:', json);

            // Update last online timestamp
            this.data.lastOnlineAt = Date.now();
            await this.save();

            return {
                ok: json.ok && json.subscriptionStatus === 'active',
                status: json.subscriptionStatus || 'unknown',
                // [DISPLAY ONLY] Expose detailed status for UI
                licenseStatus: json.licenseStatus,
                subscriptionStatus: json.subscriptionStatus,
                message: json.ok ? undefined : 'Subscription inactive'
            };

        } catch (e: any) {
            console.error('[License] Online verification failed:', e);
            return { ok: false, status: 'network_error', message: e.message || 'Network error' };
        }
    }

    public async activate(key: string): Promise<{ success: boolean; message?: string }> {
        if (!this.deviceId) await this.init();

        try {
            console.log('[License] Activating...', { url: LICENSE_SERVER_URL, deviceId: this.deviceId });
            const res = await fetch(`${LICENSE_SERVER_URL}/v1/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey: key, deviceId: this.deviceId })
            });

            const json = await res.json();
            console.log('[License] Activate response:', json);

            if (!res.ok) {
                return { success: false, message: json.error || 'Activation failed' };
            }

            // Save Data
            this.data = {
                key,
                leaseToken: json.leaseToken,
                leaseExpiresAt: new Date(json.expiresAt).getTime(),
                lastOnlineAt: Date.now(),
                deviceId: this.deviceId
            };
            await this.save();
            console.log('[License] Activated successfully, lease expires:', new Date(this.data.leaseExpiresAt));
            return { success: true };

        } catch (e: any) {
            console.error('[License] Activation error:', e);
            return { success: false, message: e.message || 'Network error or server unreachable' };
        }
    }

    /**
     * Renew Lease Token by calling /v1/lease
     */
    public async renewLease(): Promise<boolean> {
        if (!this.data) return false;

        try {
            console.log('[License] Renewing lease...', LICENSE_SERVER_URL);
            const res = await fetch(`${LICENSE_SERVER_URL}/v1/lease`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey: this.data.key, deviceId: this.deviceId })
            });

            if (res.ok) {
                const json = await res.json();
                console.log('[License] Lease renewed:', json);
                this.data.leaseToken = json.leaseToken;
                this.data.leaseExpiresAt = new Date(json.expiresAt).getTime();
                this.data.lastOnlineAt = Date.now();
                await this.save();
                return true;
            } else {
                const json = await res.json().catch(() => ({}));
                console.error('[License] Lease renewal failed:', json);
                return false;
            }
        } catch (e) {
            console.error('[License] Lease renewal network error:', e);
            return false;
        }
    }

    public async deactivate(): Promise<void> {
        this.data = null;
        await fs.unlink(LICENSE_FILE).catch(() => { });
        console.log('[License] Deactivated, license.json deleted');
    }

    private async save() {
        if (!this.data) return;
        await fs.mkdir(path.dirname(LICENSE_FILE), { recursive: true });
        await fs.writeFile(LICENSE_FILE, JSON.stringify(this.data, null, 2));
        console.log('[License] Saved to license.json');
    }
}
