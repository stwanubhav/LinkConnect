import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const AUTHORIZED_EMAIL = "anubhavpatel2526@gmail.com";
// Strictly 256-bit cryptographic SHA-256 hash. Plaintext password is NEVER stored or written anywhere.
const AUTHORIZED_PASSWORD_HASH = "5df7d67e46744d67d9d37343db110f0873c6ecca4b9b0a2f8e51e08c3916265c";
const JWT_SECRET = "zplus_security_stw_linkconnect_secret_key_8829";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { email, passwordHash } = body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanHash = String(passwordHash || "").trim();

    const emailMatch =
      cleanEmail === AUTHORIZED_EMAIL ||
      cleanEmail === "anubhavpatel2526" ||
      cleanEmail.replace(/@gmail\.com$/i, "") === "anubhavpatel2526";
    const hashMatch = cleanHash === AUTHORIZED_PASSWORD_HASH;

    if (emailMatch && hashMatch) {
      const payload = {
        email: AUTHORIZED_EMAIL,
        clearance: "LEVEL_5_Z_PLUS",
        iat: Date.now(),
        exp: Date.now() + 2 * 60 * 60 * 1000,
      };
      const sig = crypto.createHmac("sha256", JWT_SECRET).update(JSON.stringify(payload)).digest("hex");
      const token = Buffer.from(JSON.stringify(payload)).toString("base64") + "." + sig;

      res.status(200).json({
        success: true,
        token,
        user: { email: AUTHORIZED_EMAIL, clearance: "LEVEL_5_Z_PLUS" },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: "Access Denied: Invalid credentials.",
    });
  } catch (err: any) {
    res.status(400).json({ error: "bad_request", message: err.message });
  }
}
