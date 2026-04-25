import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

// POST /v1/deactivate
// Called by client when user explicitly deactivates their license on this device.
// Clears deviceId binding so the license can be activated on another device.
router.post('/deactivate', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    let payload: any;
    try {
        payload = jwt.verify(token, jwtSecret);
    } catch {
        return res.status(401).json({ error: 'Invalid or expired lease token' });
    }

    const licenseId = payload.licenseId || payload.sub;
    if (!licenseId) {
        return res.status(400).json({ error: 'Invalid token payload' });
    }

    try {
        const license = await prisma.license.findUnique({ where: { id: licenseId } });
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        await prisma.license.update({
            where: { id: licenseId },
            data: { deviceId: null, activatedAt: null },
        });

        console.log(`[LICENSE] deactivate key=${license.licenseKey.slice(0,8)}... licenseId=${licenseId.slice(0,8)}...`);
        return res.json({ ok: true, message: 'Device binding cleared' });
    } catch (error) {
        console.error(`[LICENSE] deactivate_error`, error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
