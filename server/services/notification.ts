import webpush from "web-push";
import { adminDb } from "../firebase-admin";
import { neonStorage } from "../neon-storage";

// Memory fallback to prevent 500 errors when DB is unreachable
const memorySubscriptions: any[] = [];

// Initialize VAPID
export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
}

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
    webpush.setVapidDetails(
        "mailto:admin@meteorfy.com",
        publicKey,
        privateKey
    );
} else {
    console.warn("[PUSH] VAPID keys missing — generating temporary keys for this session.");
    const vapidKeys = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    webpush.setVapidDetails(
        "mailto:admin@meteorfy.com",
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
}

export async function saveSubscription(userId: string, subscription: any) {
    console.log(`[PUSH] Saving subscription for user ${userId}`);
    try {
        // 1. Neon DB — primary persistent store
        await neonStorage.savePushSubscription(userId, subscription);

        // 2. Firestore — secondary (may fail without service account)
        try {
            const docId = Buffer.from(subscription.endpoint).toString("base64url");
            await adminDb.collection("pushSubscriptions").doc(docId).set({
                userId,
                subscription,
                endpoint: subscription.endpoint,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        } catch {
            // Firestore unavailable — Neon copy is sufficient
        }

        // 3. Memory cache (per-process fast lookup)
        const idx = memorySubscriptions.findIndex(
            s => s.userId === userId && s.endpoint === subscription.endpoint
        );
        if (idx >= 0) {
            memorySubscriptions[idx] = { ...memorySubscriptions[idx], subscription, updatedAt: new Date() };
        } else {
            memorySubscriptions.push({ userId, subscription, endpoint: subscription.endpoint, createdAt: new Date() });
        }
        return true;
    } catch (err) {
        console.error("[PUSH] Critical error in saveSubscription:", err);
        return true;
    }
}

export async function getSubscriptions(userId: string) {
    const byEndpoint = new Map<string, any>();

    // 1. Neon DB — survives server restarts
    try {
        const neonSubs = await neonStorage.getPushSubscriptions(userId);
        neonSubs.forEach(s => byEndpoint.set(s.endpoint, s));
    } catch { /* non-fatal */ }

    // 2. Memory cache — fastest, but in-process only
    memorySubscriptions
        .filter(s => s.userId === userId)
        .forEach(s => { if (!byEndpoint.has(s.endpoint)) byEndpoint.set(s.endpoint, s); });

    // 3. Firestore — last resort
    try {
        const dbSubs = await adminDb.collection("pushSubscriptions").where("userId", "==", userId).get();
        dbSubs.forEach((doc: any) => {
            const d = doc.data();
            if (!byEndpoint.has(d.endpoint)) byEndpoint.set(d.endpoint, d);
        });
    } catch { /* Firestore unavailable */ }

    return Array.from(byEndpoint.values());
}

export async function sendNotification({ userId, type, title, body, metadata }: NotificationData) {
    console.log(`[PUSH] Sending notification to ${userId} (Type: ${type})`);
    try {
        // 1. Check if sales notifications are enabled — Neon DB first, memory fallback
        if (type === "sale_captured" || type === "PURCHASE_APPROVED") {
            const enabled = await neonStorage.getSalesNotificationsEnabled(userId);
            if (!enabled) {
                console.log(`[PUSH] Sales notifications disabled for user ${userId}`);
                return;
            }
        }

        // 2. Build notification content
        let finalTitle = title || "Meteorfy";
        let finalBody = body || "Nova notificação";

        if (type === "sale_captured" || type === "PURCHASE_APPROVED") {
            const amount = metadata?.amount || "0.00";
            const currency = metadata?.currency || "USD";
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, "0");
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
            const saleCode = `MF${dd}${mm}${rand}`;
            finalTitle = "Venda realizada! 🔥";
            finalBody = `Valor: ${currency} ${amount} · ${saleCode}`;
        }

        // 3. Save history to Firestore (non-critical)
        try {
            await adminDb.collection("notifications").add({
                userId,
                type,
                title: finalTitle,
                body: finalBody,
                createdAt: new Date().toISOString(),
            });
        } catch { /* Firestore unavailable */ }

        // 4. Fetch subscriptions and send
        const subs = await getSubscriptions(userId);
        console.log(`[PUSH] Found ${subs.length} subscription(s) for user ${userId}`);

        if (subs.length === 0) {
            console.warn(`[PUSH] No subscriptions found for user ${userId} — notification not delivered`);
            return true;
        }

        const payload = JSON.stringify({
            title: finalTitle,
            body: finalBody,
            icon: "/notification-icon.png",
            badge: "/notification-icon.png",
        });

        await Promise.all(subs.map(async (sub) => {
            try {
                const finalSub = typeof sub.subscription === "string"
                    ? JSON.parse(sub.subscription)
                    : sub.subscription;
                await webpush.sendNotification(finalSub, payload);
                console.log(`[PUSH] Delivered to ${sub.endpoint?.substring(0, 40)}…`);
            } catch (error: any) {
                console.error("[PUSH] Send error:", error.statusCode, error.message);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Stale subscription — remove from all stores
                    await neonStorage.deletePushSubscription(sub.endpoint).catch(() => {});
                    try {
                        const docId = Buffer.from(sub.endpoint).toString("base64url");
                        await adminDb.collection("pushSubscriptions").doc(docId).delete();
                    } catch { /* ignore */ }
                    const mIdx = memorySubscriptions.findIndex(ms => ms.endpoint === sub.endpoint);
                    if (mIdx >= 0) memorySubscriptions.splice(mIdx, 1);
                }
            }
        }));

        return true;
    } catch (error) {
        console.error("[PUSH] Global error in sendNotification:", error);
        return false;
    }
}

interface NotificationData {
    userId: string;
    type: "sale_captured" | "sale_refunded" | "system" | "PURCHASE_APPROVED";
    title?: string;
    body?: string;
    metadata?: any;
}
