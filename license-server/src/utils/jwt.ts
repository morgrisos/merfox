import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
const LEASE_DURATION_HOURS = 72;

export interface LeasePayload {
    licenseId: string;
    licenseKey: string;
    deviceId: string;
    sub: string; // licenseId
}

export function generateLeaseToken(payload: LeasePayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: `${LEASE_DURATION_HOURS}h`,
        algorithm: 'HS256',
    });
}

export function verifyLeaseToken(token: string): LeasePayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        }) as LeasePayload;
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

export function getTokenExpiration(): Date {
    const now = new Date();
    now.setHours(now.getHours() + LEASE_DURATION_HOURS);
    return now;
}
