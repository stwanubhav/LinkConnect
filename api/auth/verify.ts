import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const JWT_SECRET = "zplus_security_stw_linkconnect_secret_key_8829";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers["authorization"] || "";
  const token = (Array.isArray(authHeader) ? authHeader[0] : authHeader).replace(/^Bearer\s+/i, "").trim();

  if (!token || !token.includes(".")) {
    res.status(401).json({ valid: false, error: "missing_token" });
    return;
  }

  const [b64, sig] = token.split(".");
  try {
    const payloadStr = Buffer.from(b64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(JSON.stringify(payload)).digest("hex");

    if (sig === expectedSig && Date.now() < payload.exp) {
      res.status(200).json({ valid: true, user: payload });
      return;
    }
  } catch {}

  res.status(401).json({ valid: false, error: "invalid_or_expired_token" });
}
