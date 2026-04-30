import webpush from "web-push";
import { adminDb } from "../firebase-admin";
import { Pool } from "pg";
import ws from "ws";

// Load .env
try {
  const envPath = require("path").resolve(__dirname, "..", "..", ".env");
  if (require("fs").existsSync(envPath)) {
    const envConfig = require("fs").readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line: string) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
        if (key.trim() && !process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
} catch (err) {
  console.error("Error loading .env in notification service:", err);
}

// Configure Neon (serverless)
const neonConfig = require("@neondatabase/serverless").neonConfig;
neonConfig.webSocketConstructor = ws;

function getPool() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
  if (!url) return null;
  return new Pool({ connectionString: url });
}

// Initialize VAPID
export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY;
}

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@meteorfy.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("[PUSH] VAPID keys missing! Push notifications will fail if not generated.");
}

export async function saveSubscription(userId: string, subscription: any): Promise<boolean> {
  console.log(`[PUSH] Saving subscription for user ${userId}`);
  try {
    // Save to Neon DB
    const pool = getPool();
    if (!pool) throw new Error("Database not configured");

    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO push_subscriptions (user_id, subscription, endpoint)
        VALUES ($1, $2, $3)
        ON CONFLICT (endpoint) DO UPDATE
        SET subscription = EXCLUDED.subscription, updated_at = NOW()
      `, [
        userId,
        JSON.stringify(subscription),
        subscription.endpoint
      ]);
      console.log(`[PUSH] Subscription saved to DB`);
    } finally {
      client.release();
    }

    return true;
  } catch (err: any) {
    console.error("[PUSH] Error saving subscription:", err);
    return false;
  }
}

export async function removeSubscription(userId: string): Promise<void> {
  try {
    const pool = getPool();
    if (!pool) return;

    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId]);
      console.log(`[PUSH] Subscription removed for user ${userId}`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[PUSH] Error removing subscription:", err);
  }
}

export async function sendNotification({ userId, type, title, body, metadata }: any): Promise<boolean> {
  console.log(`[PUSH] Sending notification to ${userId} (Type: ${type})`);
  try {
    // 1. Check User Settings
    let salesNotificationsEnabled = true;
    try {
      const pool = getPool();
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`SELECT sales_notifications FROM settings WHERE user_id = $1 LIMIT 1`, [userId]);
          if (result.rows.length > 0) {
            salesNotificationsEnabled = result.rows[0].sales_notifications !== false;
          }
        } finally {
          client.release();
        }
      }
    } catch (dbErr) {
      console.warn("[PUSH] Failed to check settings:", dbErr);
    }

    if ((type === "sale_captured" || type === "PURCHASE_APPROVED") && !salesNotificationsEnabled) {
      console.log(`[PUSH] Sales notifications disabled for user ${userId}`);
      return false;
    }

    // 2. Generate content
    let finalTitle = title || "Meteorfy";
    let finalBody = body || "Nova notificação";

    if (type === "sale_captured" || type === "PURCHASE_APPROVED") {
      const amount = metadata?.amount || "0.00";
      const currency = metadata?.currency || "USD";
      const productName = metadata?.productName || "";
      finalTitle = "Venda aprovada";
      finalBody = productName
        ? `${productName} — ${currency} ${amount}`
        : `Valor: ${currency} ${amount}`;
    }

    // 3. Get subscription from DB
    const pool = getPool();
    if (!pool) throw new Error("Database not configured");

    const client = await pool.connect();
    let subscriptions: any[] = [];
    try {
      const result = await client.query(`SELECT * FROM push_subscriptions WHERE user_id = $1`, [userId]);
      subscriptions = result.rows.map((row: any) => row.subscription);
    } finally {
      client.release();
    }

    if (subscriptions.length === 0) {
      console.log(`[PUSH] No subscriptions found for user ${userId}`);
      return false;
    }

    console.log(`[PUSH] Found ${subscriptions.length} push subscriptions for user`);

    const payload = JSON.stringify({
      title: finalTitle,
      body: finalBody,
      icon: "/notification-icon.png",
      badge: "/notification-icon.png",
    });

    // 4. Send to all subscriptions
    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub, payload);
        console.log(`[PUSH] Sent successfully`);
      } catch (error: any) {
        console.error("[PUSH] Error sending:", error.statusCode, error.message);
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Remove invalid subscription
          const pool2 = getPool();
          if (pool2) {
            const client2 = await pool2.connect();
            try {
              await client2.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [sub.endpoint]);
            } finally {
              client2.release();
            }
          }
        }
      }
    });

    await Promise.all(sendPromises);
    return true;
  } catch (error: any) {
    console.error("[PUSH] Global error in sendNotification:", error);
    return false;
  }
}