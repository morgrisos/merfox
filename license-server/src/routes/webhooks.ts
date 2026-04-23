import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { generateLicenseKey } from '../utils/licenseKey';

const router = Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// POST /v1/webhooks/stripe
router.post('/stripe', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        return res.status(400).send('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const customerEmail = session.customer_details?.email || undefined;

    if (!customerId || !subscriptionId) {
        console.error('Missing customer or subscription ID in checkout session');
        return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Create or update customer
    const customer = await prisma.customer.upsert({
        where: { stripeCustomerId: customerId },
        update: { email: customerEmail },
        create: {
            stripeCustomerId: customerId,
            email: customerEmail,
        },
    });

    // Create subscription record
    await prisma.subscription.create({
        data: {
            customerId: customer.id,
            stripeSubscriptionId: subscriptionId,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
    });

    // Generate license if not exists
    const existingLicense = await prisma.license.findFirst({
        where: { customerId: customer.id },
    });

    if (!existingLicense) {
        const licenseKey = generateLicenseKey();
        await prisma.license.create({
            data: {
                customerId: customer.id,
                licenseKey,
                status: 'active',
            },
        });
    }

    console.log(`Checkout completed for customer: ${customerId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const customer = await prisma.customer.findUnique({
        where: { stripeCustomerId: customerId },
    });

    if (!customer) {
        console.error(`Customer not found: ${customerId}`);
        return;
    }

    // Update subscription
    await prisma.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        update: {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        create: {
            customerId: customer.id,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
    });

    // Update license status
    if (subscription.status !== 'active') {
        await prisma.license.updateMany({
            where: { customerId: customer.id },
            data: { status: 'inactive' },
        });
    } else {
        await prisma.license.updateMany({
            where: { customerId: customer.id },
            data: { status: 'active' },
        });
    }

    console.log(`Subscription updated: ${subscription.id} - ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const customer = await prisma.customer.findUnique({
        where: { stripeCustomerId: customerId },
    });

    if (!customer) {
        console.error(`Customer not found: ${customerId}`);
        return;
    }

    // Mark subscription as canceled
    await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'canceled' },
    });

    // Cancel licenses
    await prisma.license.updateMany({
        where: { customerId: customer.id },
        data: { status: 'canceled' },
    });

    console.log(`Subscription deleted: ${subscription.id}`);
}

export default router;
