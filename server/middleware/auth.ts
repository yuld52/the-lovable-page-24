import { adminAuth } from "../firebase-admin";
import { neonStorage } from "../neon-storage";

function serializeError(err: any) {
  return {
    name: err?.name,
    message: err?.message || String(err),
    cause: err?.cause
      ? {
        name: err.cause?.name,
        message: err.cause?.message || String(err.cause),
        code: err.cause?.code,
      }
      : undefined,
  };
}

export async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !String(authHeader).startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = String(authHeader).slice("Bearer ".length);

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Could not verify token",
      });
    }

    (req as any).user = {
      id: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      firebase: decodedToken,
    };
    // Persist email on every authenticated request so admin can display it
    if (decodedToken.uid && decodedToken.email) {
      neonStorage.saveUserEmail(decodedToken.uid, decodedToken.email).catch(() => {});
    }
    next();
  } catch (err: any) {
    const safe = serializeError(err);
    console.error("requireAuth error:", safe);

    // Keep response useful for debugging without leaking secrets.
    return res.status(401).json({
      error: "Auth middleware failed",
      message: err?.message || "Invalid or expired token",
    });
  }
}
