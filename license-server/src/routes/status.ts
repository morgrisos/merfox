import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyLeaseToken } from '../utils/jwt';

const router = Router();
const prisma = new PrismaClient();

// GET /v1/status
router.get('/status', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);

    try {
        // Verify token
        const payload = verifyLeaseToken(token);

        // Check license status in DB
        const license = await prisma.license.findUnique({
            where: { id: payload.licenseId },
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

        const activeSub = license.customer.subscriptions[0];
        const subscriptionStatus = activeSub ? activeSub.status : 'inactive';

        return res.json({
            ok: true,
            licenseStatus: license.status,
            subscriptionStatus,
            deviceId: license.deviceId,
            lastSeenAt: license.lastSeenAt,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired token') {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        console.error('Status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
