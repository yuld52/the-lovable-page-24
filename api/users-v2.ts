import { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuth, isAdmin } from "./_lib/auth";
import { adminAuth } from "./_lib/firebase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const auth = await verifyAuth(req);
  
  if (!isAdmin({ user: auth.user })) {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    if (req.method === "GET") {
      const list = await adminAuth.listUsers(1000);
      return res.json(list.users.map(u => ({ 
        id: u.uid, 
        email: u.email, 
        username: u.displayName || u.email, 
        createdAt: u.metadata.creationTime 
      })));
    }

    if (req.method === "POST") {
      const { email, password } = req.body;
      const user = await adminAuth.createUser({ email, password, emailVerified: true });
      return res.status(201).json({ 
        id: user.uid, 
        email: user.email, 
        success: true 
      });
    }

    if (req.method === "DELETE") {
      const uid = Array.isArray(req.query.uid) ? req.query.uid[0] : req.query.uid;
      await adminAuth.deleteUser(uid as string);
      return res.json({ success: true });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err: any) {
    console.error("Users API error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}