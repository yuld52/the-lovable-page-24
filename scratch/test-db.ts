import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";

if (!url) {
  console.error("❌ NEON_DATABASE_URL não configurada");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 2 });

pool.on("error", (err: Error) => {
  console.error("[STORAGE] Pool error:", err.message);
});

// Simulate server/neon-storage.ts getProducts call
async function test() {
  try {
    const client = await pool.connect();
    try {
      const query = `SELECT * FROM products ORDER BY created_at DESC LIMIT 5`;
      const result = await client.query(query);
      console.log("✅ getProducts OK — rows:", result.rows.length);
      if (result.rows.length > 0) console.log("First product name:", result.rows[0].name);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("❌ getProducts FAILED:", error.message);
    process.exit(1);
  }
}

// Timeout guard
const timeout = setTimeout(() => {
  console.error("⏱️  TIMEOUT — query took too long (likely connection hang)");
  process.exit(1);
}, 10000);

test().then(() => {
  clearTimeout(timeout);
  return pool.end();
}).then(() => {
  console.log("✅ Connection closed cleanly");
  process.exit(0);
}).catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
