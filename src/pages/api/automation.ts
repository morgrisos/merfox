import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

// Config path: Project Root / merfox.automation.json
// process.cwd() in Next.js usually points to project root.
const CONFIG_PATH = path.join(process.cwd(), 'merfox.automation.json');

type Schedule = {
    kind: 'daily';
    hour: number;
    minute: number;
};

type AutomationConfig = {
    enabled: boolean;
    schedule: Schedule;
    targetUrl: string;
};

const DEFAULT_CONFIG: AutomationConfig = {
    enabled: false,
    schedule: { kind: 'daily', hour: 9, minute: 0 },
    targetUrl: ''
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf8');
            const config = JSON.parse(data);
            return res.status(200).json(config);
        } catch (error: any) {
            // If file doesn't exist, return default
            if (error.code === 'ENOENT') {
                return res.status(200).json(DEFAULT_CONFIG);
            }
            console.error('Failed to read automation config:', error);
            return res.status(500).json({ error: 'Failed to read config' });
        }
    } else if (req.method === 'POST') {
        try {
            const newConfig = req.body;
            // Basic validation
            if (typeof newConfig.enabled !== 'boolean' || !newConfig.schedule || typeof newConfig.targetUrl !== 'string') {
                return res.status(400).json({ error: 'Invalid config format' });
            }

            await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
            return res.status(200).json({ success: true, config: newConfig });
        } catch (error) {
            console.error('Failed to save automation config:', error);
            return res.status(500).json({ error: 'Failed to save config' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
