import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateLeaseToken, getTokenExpiration } from '../utils/jwt';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /v1/reactivate
 *
 * 同一キーを持つユーザーが同一端末から再認証する際、
 * device mismatch を自動解消してライセンスを再bindする。
 *
 * セキュリティ:
 * - licenseKey を知っていること自体が認証。管理者操作不要。
 * - 成功すると旧deviceIdは上書きされるため、旧端末からは使えなくなる。
 *   これは /admin/reset-device と同等の動作。
 */
router.post('/reactivate', async (req: Request, res: Response) => {
    const { licenseKey, deviceId } = req.body;

    if (!licenseKey || !deviceId) {
        return res.status(400).json({ error: 'licenseKey and deviceId are required' });
    }

    try {
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
            console.log(`[LICENSE] reactivate_fail key=${licenseKey.slice(0, 8)}... reason=not_found`);
            return res.status(404).json({ error: 'License not found' });
        }

        if (license.status !== 'active') {
            console.log(`[LICENSE] reactivate_fail key=${licenseKey.slice(0, 8)}... reason=license_${license.status}`);
            return res.status(403).json({ error: 'License is not active' });
        }

        const activeSub = license.customer.subscriptions[0];
        if (!activeSub || new Date(activeSub.currentPeriodEnd) < new Date()) {
            console.log(`[LICENSE] reactivate_fail key=${licenseKey.slice(0, 8)}... reason=subscription_invalid`);
            return res.status(403).json({ error: 'No valid subscription found' });
        }

        // deviceId を上書きして再bind
        await prisma.license.update({
            where: { id: license.id },
            data: {
                deviceId,
                lastSeenAt: new Date(),
            },
        });

        const leaseToken = generateLeaseToken({
            licenseId: license.id,
            licenseKey: license.licenseKey,
            deviceId,
            sub: license.id,
        });

        const expiresAt = getTokenExpiration();

        console.log(`[LICENSE] reactivate_success key=${licenseKey.slice(0, 8)}... device=${deviceId.slice(0, 8)}... expires=${expiresAt}`);
        return res.json({ ok: true, leaseToken, expiresAt });

    } catch (error) {
        console.error('[LICENSE] reactivate_error', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
