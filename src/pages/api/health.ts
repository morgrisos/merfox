import { NextApiRequest, NextApiResponse } from "next";
import pkg from "../../../package.json";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: "ok", version: pkg.version });
}
