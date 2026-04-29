import { adminAuth } from "./firebase-admin";

export interface AuthenticatedRequest {
  user?: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

// Middleware to verify Firebase Auth token in serverless environment
export async function verifyAuth(req: any): Promise<AuthenticatedRequest> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !String(authHeader).startsWith("Bearer ")) {
      return {};
    }

    const token = String(authHeader).slice("Bearer ".length);

    if (!token) return {};

    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken) return {};

    return {
      user: {
        id: decodedToken.uid,
        email: decodedToken.email || "",
        emailVerified: decodedToken.email_verified || false,
      }
    };
  } catch (err) {
    console.error("Auth verification error:", err);
    return {};
  }
}

export const ADMIN_EMAIL = "yuldchissico11@gmail.com";

export function isAdmin(req: AuthenticatedRequest): boolean {
  return req.user?.email?.toLowerCase().trim() === ADMIN_EMAIL;
}