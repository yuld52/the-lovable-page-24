import crypto from "crypto";
import { adminDb } from "./firebase-admin";

import { processTopFunnelTracking, processCheckoutEventTracking, processPaymentPendingTracking } from "./tracking";

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

async function checkDedupeFirestore(dedupeKey: string): Promise<boolean> {
  try {
    const snapshot = await adminDb.collection("tracking_events")
      .where("dedupe_key", "==", dedupeKey)
      .limit(1)
      .get();
    return !snapshot.empty;
  } catch (err) {
    console.error("Firestore dedupe check error:", err);
    return false;
  }
}

async function insertTrackingLog(row: {
  ownerId: string;
  saleId?: number | null;
  checkoutId?: number | null;
  sessionId?: string | null;
  destination: string;
  eventName: string;
  dedupeKey: string;
  payload: any;
  responseStatus?: number | null;
  responseBody?: string | null;
}) {
  try {
    await adminDb.collection("tracking_events").add({
      ...row,
      payload: row.payload ? JSON.stringify(row.payload) : null,
      created_at: new Date(),
    });
  } catch (err) {
    console.error("Firestore tracking log insert error:", err);
  }
}

export function registerTrackingRoutes(app: any, storage: any) {
  // Top-of-funnel + checkout intent events (public)
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

      // Compose a lightweight "sale-like" payload
      const base = {
        id: body.id ?? 0,
        amount: body.amount ?? 0,
        customerEmail: cleanString(body.email),
        ...getUtmFromBody(body),
      };

      const dedupeKey = sha256(
        ["public", ownerId, String(checkout.id), sessionId ?? "", eventName].join("|"),
      );

      // If already logged, we short-circuit (dedupe strong)
      const isDuplicated = await checkDedupeFirestore(dedupeKey);
      if (isDuplicated) return res.json({ ok: true, deduped: true });

      // Send
      if (eventName === "PageView" || eventName === "ViewContent") {
        await processTopFunnelTracking(settings as any, eventName as any, base as any);

        // Incrementar visualizações do checkout
        if (checkout.id) {
          try {
            const checkoutRef = adminDb.collection("checkouts").doc(String(checkout.id));
            const checkoutDoc = await checkoutRef.get();
            if (checkoutDoc.exists) {
              const currentData = checkoutDoc.data();
              const currentViews = currentData?.views || 0;
              await checkoutRef.update({ views: currentViews + 1 });
            }
          } catch (err) {
            console.error("Error incrementing views:", err);
          }
        }

        await insertTrackingLog({
          ownerId,
          checkoutId: Number(checkout.id),
          sessionId,
          destination: "multi",
          eventName,
          dedupeKey,
          payload: { eventName, ...base },
        });
      } else if (eventName === "checkout") {
        await processCheckoutEventTracking(settings as any, base as any);
        await insertTrackingLog({
          ownerId,
          checkoutId: Number(checkout.id),
          sessionId,
          destination: "utmfy",
          eventName,
          dedupeKey,
          payload: { eventName, ...base },
        });
      } else if (eventName === "payment_pending") {
        console.log("📧 [UTMIFY] Recebido evento payment_pending");
        console.log("📧 [UTMIFY] Token configurado:", settings?.utmfyToken ? "SIM ✅" : "NÃO ❌");
        console.log("📧 [UTMIFY] Dados do evento:", { ownerId, checkoutId: checkout.id, sessionId });

        await processPaymentPendingTracking(settings as any, base as any);

        console.log("📧 [UTMIFY] Evento payment_pending processado!");

        await insertTrackingLog({
          ownerId,
          checkoutId: Number(checkout.id),
          sessionId,
          destination: "utmfy",
          eventName,
          dedupeKey,
          payload: { eventName, ...base },
        });
      }

      return res.writeHead(200, jsonHeaders).end(JSON.stringify({ ok: true }));
    } catch (err: any) {
      console.error("POST /api/tracking/event error:", err);
      return res.status(500).json({ message: err?.message || "Tracking error" });
    }
  });
}