import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateLeaseToken, getTokenExpiration } from '../utils/jwt';

const router = Router();
const prisma = new PrismaClient();

// POST /v1/activate
router.post('/activate', async (req: Request, res: Response) => {
    const { licenseKey, deviceId } = req.body;

    if (!licenseKey || !deviceId) {
        return res.status(400).json({ error: 'licenseKey and deviceId are required' });
    }

    try {
        // Find license
        const license = await prisma.license.findUnique({
            where: { licenseKey },
            include: {
                customer: {
                    include: {
                        subscriptions: {
                            where: { status: 'active' },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        if (license.status !== 'active') {
            return res.status(403).json({ error: 'License is not active' });
        }

        // Check subscription
        const activeSub = license.customer.subscriptions[0];
        if (!activeSub) {
            return res.status(403).json({ error: 'No active subscription found' });
        }

        // Check if subscription is still valid
        if (new Date(activeSub.currentPeriodEnd) < new Date()) {
            return res.status(403).json({ error: 'Subscription has expired' });
        }

        // Handle device binding
        if (license.deviceId === null) {
            // First activation - bind device
            await prisma.license.update({
                where: { id: license.id },
                data: {
                    deviceId,
                    activatedAt: new Date(),
                    lastSeenAt: new Date(),
                },
            });
        } else if (license.deviceId !== deviceId) {
            // Device mismatch
            return res.status(409).json({
                error: 'License already activated on another device',
                boundDevice: license.deviceId,
            });
        } else {
            // Same device - update lastSeenAt
            await prisma.license.update({
                where: { id: license.id },
                data: { lastSeenAt: new Date() },
            });
        }

        // Generate lease token
        const leaseToken = generateLeaseToken({
            licenseId: license.id,
            licenseKey: license.licenseKey,
            deviceId,
            sub: license.id,
        });

        const expiresAt = getTokenExpiration();

        return res.json({
            ok: true,
            leaseToken,
            expiresAt,
        });
    } catch (error) {
        console.error('Activate error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
