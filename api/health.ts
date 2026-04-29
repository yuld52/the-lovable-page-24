import { VercelRequest, VercelResponse } from "@vercel/node";
import { getDbClient } from "./_lib/database";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = await getDbClient();
    try {
      // Simple query to test connection
      await client.query("SELECT NOW()");
      return res.json({ 
        ok: true, 
        message: "API is running on Vercel!",
        timestamp: new Date().toISOString() 
      });
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("Health check failed:", error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
}