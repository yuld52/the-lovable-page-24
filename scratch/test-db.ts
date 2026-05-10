import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

async function testConnection() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";
  console.log("Testing connection to:", url.split("@")[1] || "No URL");

  if (!url) {
    console.error("❌ No database URL found in .env");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  try {
    const client = await pool.connect();
    console.log("✅ Successfully connected to the database!");
    const res = await client.query("SELECT NOW()");
    console.log("🕒 Database time:", res.rows[0].now);
    client.release();
  } catch (err) {
    console.error("❌ Connection failed:", err);
  } finally {
    await pool.end();
  }
}

testConnection();
