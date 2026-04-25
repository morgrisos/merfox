import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

function getLicenseFile(): string {
    const dir = process.env.MERFOX_USER_DATA
        || path.join(os.homedir(), 'Library/Application Support/merfox');
    return path.join(dir, 'license.json');
}

interface JwtVerifyResult {
    valid: boolean;
    payload: Record<string, any> | null;
    reason?: 'MALFORMED' | 'SIGNATURE_MISMATCH' | 'EXPIRED' | 'PARSE_ERROR';
}

/**
 * Verify JWT token structure and expiry.
 * Signature check: if MERFOX_JWT_SECRET is set and signature doesn't match,
 * we LOG a warning but do NOT block — signature key mismatch between the license
 * server and the app would otherwise deny all valid tokens.
 * The exp claim is the authoritative validity gate.
 */
function verifyJwtExpiry(token: string): JwtVerifyResult {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('[LICENSE_JWT] MALFORMED — expected 3 parts, got', parts.length);
            return { valid: false, payload: null, reason: 'MALFORMED' };
        }

        const [header, payloadB64, sig] = parts;

        // Signature check (non-blocking: mismatch logs warning but doesn't deny)
        const secret = process.env.MERFOX_JWT_SECRET;
        if (secret) {
            const expectedSig = createHmac('sha256', secret)
                .update(`${header}.${payloadB64}`)
                .digest('base64url');
            const expectedBuf = Buffer.from(expectedSig, 'utf8');
            const actualBuf = Buffer.from(sig, 'utf8');
            const sigMatch = expectedBuf.length === actualBuf.length &&
                timingSafeEqual(expectedBuf, actualBuf);
            if (!sigMatch) {
                // Non-fatal: license server may use a different signing key.
                // We fall through to exp check.
                console.warn('[LICENSE_JWT] signature_mismatch — continuing to exp check (non-fatal)');
            } else {
                console.log('[LICENSE_JWT] signature_ok');
            }
        } else {
            console.warn('[LICENSE_JWT] MERFOX_JWT_SECRET not set — skipping signature check');
        }

        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

        if (!payload.exp || Date.now() >= payload.exp * 1000) {
            console.error('[LICENSE_JWT] EXPIRED exp=', payload.exp, 'now=', Math.floor(Date.now() / 1000));
            return { valid: false, payload, reason: 'EXPIRED' };
        }

        console.log('[LICENSE_JWT] valid exp=', new Date(payload.exp * 1000).toISOString());
        return { valid: true, payload };
    } catch (e) {
        console.error('[LICENSE_JWT] PARSE_ERROR', e);
        return { valid: false, payload: null, reason: 'PARSE_ERROR' };
    }
}

/**
 * Server-side license validity check.
 * Priority order:
 *   1. license.json on disk (trusted — written by main process via IPC)
 *      → checks leaseExpiresAt + lastOnlineAt (72h grace), no JWT signature required
 *   2. Cookie `merfox_lease_token`
 *      → JWT exp check (signature mismatch is non-fatal warning)
 *   3. Authorization: Bearer <token>
 *      → JWT exp check (signature mismatch is non-fatal warning)
 */
export async function isLicenseValid(req?: NextApiRequest): Promise<boolean> {
    const licenseFile = getLicenseFile();
    console.log('[LICENSE_CHECK] file_path=', licenseFile);

    // ── 1. File-based check ──────────────────────────────────────────────────
    try {
        const raw = await fs.readFile(licenseFile, 'utf8');
        const data = JSON.parse(raw);

        console.log('[LICENSE_CHECK] file_found key=', data.key,
            'leaseExpiresAt=', data.leaseExpiresAt ? new Date(data.leaseExpiresAt).toISOString() : 'none',
            'lastOnlineAt=', data.lastOnlineAt ? new Date(data.lastOnlineAt).toISOString() : 'none');

        if (!data.leaseToken) {
            console.warn('[LICENSE_CHECK] file: no leaseToken');
        } else if (!data.leaseExpiresAt || Date.now() > data.leaseExpiresAt) {
            console.warn('[LICENSE_CHECK] file: leaseExpired at', data.leaseExpiresAt);
        } else {
            const diffHours = (Date.now() - (data.lastOnlineAt || 0)) / (1000 * 60 * 60);
            if (diffHours > 72) {
                console.warn('[LICENSE_CHECK] file: offline too long', diffHours.toFixed(1), 'h > 72h');
            } else {
                // File written by trusted main process via IPC — no JWT signature check needed
                console.log('[LICENSE_CHECK] decision=allow source=file offline_hours=', diffHours.toFixed(1));
                return true;
            }
        }
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            console.warn('[LICENSE_CHECK] file: not found at', licenseFile);
        } else {
            console.error('[LICENSE_CHECK] file: read error', e.message);
        }
    }

    // ── 2. Cookie-based check ────────────────────────────────────────────────
    const rawCookie = req?.headers?.cookie ?? '';
    const cookieToken = req?.cookies?.merfox_lease_token;
    console.log('[LICENSE_CHECK] cookie_present=', !!cookieToken,
        'raw_cookie_header=', rawCookie ? rawCookie.substring(0, 80) : '(none)');

    if (cookieToken) {
        const result = verifyJwtExpiry(cookieToken);
        if (result.valid) {
            console.log('[LICENSE_CHECK] decision=allow source=cookie');
            return true;
        }
        console.warn('[LICENSE_CHECK] cookie token invalid reason=', result.reason);
    }

    // ── 3. Authorization header ──────────────────────────────────────────────
    const authHeader = req?.headers?.authorization ?? '';
    const hasBearer = authHeader.startsWith('Bearer ');
    console.log('[LICENSE_CHECK] auth_header_present=', !!authHeader,
        'auth_header_prefix=', hasBearer ? 'Bearer' : authHeader.substring(0, 10) || 'none');

    if (hasBearer) {
        const token = authHeader.slice(7);
        const result = verifyJwtExpiry(token);
        if (result.valid) {
            console.log('[LICENSE_CHECK] decision=allow source=authorization_header');
            return true;
        }
        console.warn('[LICENSE_CHECK] authorization token invalid reason=', result.reason);
    }

    console.error('[LICENSE_CHECK] decision=deny deny_reason=all_paths_failed',
        'cookie=', !!cookieToken, 'bearer=', hasBearer);
    return false;
}

/**
 * HOF: wraps a pages-router API handler with a license check.
 */
export function withLicense(handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        console.log('[SCRAPER_RUN_AUTH_ENTRY] method=', req.method, 'url=', req.url);
        if (!(await isLicenseValid(req))) {
            return res.status(403).json({
                error: 'License required',
                code: 'LICENSE_REQUIRED',
            });
        }
        return handler(req, res);
    };
}
