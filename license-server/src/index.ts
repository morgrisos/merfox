import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import activateRoute from './routes/activate';
import leaseRoute from './routes/lease';
import statusRoute from './routes/status';
import adminRoute from './routes/admin';
import webhooksRoute from './routes/webhooks';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'merfox-license-server' });
});

// Stripe webhooks need raw body
app.use('/v1/webhooks', express.raw({ type: 'application/json' }), webhooksRoute);

// JSON body parser for other routes
app.use(express.json());

// Routes
app.use('/v1', activateRoute);
app.use('/v1', leaseRoute);
app.use('/v1', statusRoute);
app.use('/v1/admin', adminRoute);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 License server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
