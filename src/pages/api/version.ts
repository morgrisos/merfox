import { NextApiRequest, NextApiResponse } from "next";
import pkg from "../../../package.json";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({
        version: pkg.version,
        build: "production", // Could be dynamic if needed, but fixed for now
        platform: process.platform,
        node: process.version
    });
}
