import type { Express } from "express";
import crypto from "crypto";
import { pool, ensurePool, isPostgresEnabled, db } from "./db";
import type { IStorage } from "./storage";
import { processTopFunnelTracking, processCheckoutEventTracking, processPaymentPendingTracking } from "./tracking";
import { sql, eq } from "drizzle-orm";
import { checkouts } from "@shared/schema";

const jsonHeaders = { "Content-Type": "application/json" };

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function getUtmFromBody(body: any) {
  return {
    utmSource: cleanString(body?.utm_source ?? body?.utmSource),
    utmMedium: cleanString(body?.utm_medium ?? body?.utmMedium),
    utmCampaign: cleanString(body?.utm_campaign ?? body?.utmCampaign),
    utmContent: cleanString(body?.utm_content ?? body?.utmContent),
    utmTerm: cleanString(body?.utm_term ?? body?.utmTerm),
  };
}

export function registerTrackingRoutes(app: Express, storage: IStorage) {
  app.post("/api/tracking/event", async (req, res) => {
    try {
      const body = req.body || {};
      const slug = cleanString(body.slug);
      const checkoutId = body.checkoutId != null ? Number(body.checkoutId) : null;
      const eventName = cleanString(body.eventName);
      const sessionId = cleanString(body.sessionId);

      if (!eventName) return res.status(400).json({ message: "Missing eventName" });
      if (!slug && !checkoutId) return res.status(400).json({ message: "Missing slug/checkoutId" });

      const checkout = checkoutId
        ? await storage.getCheckoutPublic(checkoutId)
        : slug
          ? await storage.getCheckoutBySlug(slug)
          : undefined;

      if (!checkout?.ownerId) return res.json({ ok: true });

      const ownerId = String(checkout.ownerId);
      const settings = await storage.getSettings(ownerId);

      const base = {
        id: body.id ?? 0,
        amount: body.amount ?? 0,
        customerEmail: cleanString(body.email),
        ...getUtmFromBody(body),
      };

      // Increment views using Drizzle
      if (checkout.id) {
        await db.update(checkouts)
          .set({ views: sql`${checkouts.views} + 1` })
          .where(eq(checkouts.id, checkout.id))
          .catch(err => console.error("Error incrementing views:", err));
      }

      if (eventName === "PageView" || eventName === "ViewContent") {
        await processTopFunnelTracking(settings as any, eventName as any, base as any);
      } else if (eventName === "checkout") {
        await processCheckoutEventTracking(settings as any, base as any);
      } else if (eventName === "payment_pending") {
        await processPaymentPendingTracking(settings as any, base as any);
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("POST /api/tracking/event error:", err);
      return res.status(500).json({ message: err?.message || "Tracking error" });
    }
  });
}