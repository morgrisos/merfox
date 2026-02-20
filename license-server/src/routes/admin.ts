import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdminKey } from '../utils/auth';
import { generateLicenseKey } from '../utils/licenseKey';

const router = Router();
const prisma = new PrismaClient();

// POST /v1/admin/issue
router.post('/issue', requireAdminKey, async (req: Request, res: Response) => {
    const { email, customerId, note } = req.body;

    try {
        let customer;

        // Find or create customer
        if (customerId) {
            customer = await prisma.customer.findUnique({
                where: { id: customerId },
            });
            if (!customer) {
                return res.status(404).json({ error: 'Customer not found' });
            }
        } else if (email) {
            customer = await prisma.customer.upsert({
                where: { email },
                update: {},
                create: { email },
            });
        } else {
            // Create anonymous customer
            customer = await prisma.customer.create({
                data: {},
            });
        }

        // Generate license
        const licenseKey = generateLicenseKey();

        const license = await prisma.license.create({
            data: {
                customerId: customer.id,
                licenseKey,
                status: 'active',
            },
        });

        return res.json({
            ok: true,
            licenseKey: license.licenseKey,
            customerId: customer.id,
            licenseId: license.id,
            note: note || undefined,
        });
    } catch (error) {
        console.error('Admin issue error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
