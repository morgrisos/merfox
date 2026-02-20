import { Request, Response, NextFunction } from 'express';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-admin-key'];

    if (!apiKey || apiKey !== ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid admin API key' });
    }

    next();
}
