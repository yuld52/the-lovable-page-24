import webpush from "web-push";
import { adminDb } from "../firebase-admin";

// Memory fallback to prevent 500 errors when DB is unreachable
const memorySubscriptions: any[] = [];
const memorySettings: Record<string, any> = {};

// Initialize VAPID
export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
}

// Ensure keys are set up at start
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
    webpush.setVapidDetails(
        "mailto:admin@meteorfy.com",
        publicKey,
        privateKey
    );
} else {
    console.warn("[PUSH] VAPID keys missing! Push notifications will fail if not generated.");
    if (process.env.NODE_ENV !== 'production') {
        const vapidKeys = webpush.generateVAPIDKeys();
        process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
        process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
        webpush.setVapidDetails(
            "mailto:admin@meteorfy.com",
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
        console.log("[PUSH] Temporary VAPID keys generated for this session.");
    }
}

export async function saveSubscription(userId: string, subscription: any) {
    console.log(`[PUSH] Saving subscription for user ${userId}`);
    try {
        try {
            const docId = Buffer.from(subscription.endpoint).toString('base64url');
            await adminDb.collection("pushSubscriptions").doc(docId).set({
                userId,
                subscription,
                endpoint: subscription.endpoint,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log(`[PUSH] Subscription saved to Firestore`);
        } catch (dbErr) {
            console.warn("[PUSH] Firestore unreachable during saveSubscription, falling back to memory.");
        }

        // Always save to memory as a cache/backup
        const idx = memorySubscriptions.findIndex(s => s.userId === userId && s.endpoint === subscription.endpoint);
        if (idx >= 0) {
            memorySubscriptions[idx] = { ...memorySubscriptions[idx], subscription, updatedAt: new Date() };
        } else {
            memorySubscriptions.push({ userId, subscription, endpoint: subscription.endpoint, createdAt: new Date() });
        }
        return true;
    } catch (err) {
        console.error("[PUSH] Critical error in saveSubscription:", err);
        return true; // We return true because memory save usually succeeds
    }
}

export async function getSubscriptions(userId: string) {
    const allSubs: any[] = [];

    try {
        const dbSubs = await adminDb.collection("pushSubscriptions").where("userId", "==", userId).get();
        dbSubs.forEach(doc => {
            allSubs.push(doc.data());
        });
    } catch (err) {
        console.warn("[PUSH] Failed to fetch subscriptions from Firestore, using memory cache.");
    }

    // 2. Add from memory, avoiding duplicates by endpoint
    memorySubscriptions.filter(s => s.userId === userId).forEach(ms => {
        if (!allSubs.find(as => as.endpoint === ms.endpoint)) {
            allSubs.push(ms);
        }
    });

    return allSubs;
}

export async function sendNotification({ userId, type, title, body, metadata }: NotificationData) {
    console.log(`[PUSH] Sending notification to ${userId} (Type: ${type})`);
    try {
        // 1. Check User Settings
        let salesNotificationsEnabled = true; // Default if we can't check

        try {
            const snapshot = await adminDb.collection("settings").where("userId", "==", userId).limit(1).get();
            if (!snapshot.empty) {
                const dbSettings = snapshot.docs[0].data();
                salesNotificationsEnabled = dbSettings?.salesNotifications !== false && dbSettings?.sales_notifications !== false;
            }
        } catch (dbErr) {
            console.warn("[PUSH] Firestore unreachable during settings check.");
            salesNotificationsEnabled = memorySettings[userId]?.salesNotifications !== false;
        }

        if ((type === "sale_captured" || type === "PURCHASE_APPROVED") && !salesNotificationsEnabled) {
            console.log(`[PUSH] Sales notifications disabled for user ${userId}`);
            return;
        }

        // 2. Generate content
        let finalTitle = title || "Meteorfy";
        let finalBody = body || "Nova notificação";

        if (type === "sale_captured" || type === "PURCHASE_APPROVED") {
            const amount = metadata?.amount || "0.00";
            const currency = metadata?.currency || "USD";
            // Generate Meteorfy sale code — MF + DDMM + 6 random digits (e.g. MF2801507622)
            const now = new Date();
            const dd = String(now.getDate()).padStart(2, "0");
            const mm = String(now.getMonth() + 1).padStart(2, "0");
            const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
            const saleCode = `MF${dd}${mm}${rand}`;
            finalTitle = "Venda realizada! 🔥";
            finalBody = `Valor: ${currency} ${amount} · ${saleCode}`;
        }

        // 3. Save to History (Optional)
        try {
             await adminDb.collection("notifications").add({
                 userId,
                 type,
                 title: finalTitle,
                 body: finalBody,
                 createdAt: new Date().toISOString()
             });
        } catch (dbErr) {
            console.warn("[PUSH] Failed to save notification history to Firestore.");
        }

        // 4. Send Push
        const subs = await getSubscriptions(userId);
        console.log(`[PUSH] Found ${subs.length} push subscriptions for user`);

        const payload = JSON.stringify({
            title: finalTitle,
            body: finalBody,
            icon: "/notification-icon.png",
            badge: "/notification-icon.png",
        });

        const sendPromises = subs.map(async (sub) => {
            try {
                const subscription = sub.subscription;
                // If the subscription object is a string, parse it
                const finalSub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
                await webpush.sendNotification(finalSub, payload);
                console.log(`[PUSH] Sent successfully to endpoint: ${sub.endpoint?.substring(0, 30)}...`);
            } catch (error: any) {
                console.error("[PUSH] Error sending to subscription:", error.statusCode, error.message);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    try {
                        const docId = Buffer.from(sub.endpoint).toString('base64url');
                        await adminDb.collection("pushSubscriptions").doc(docId).delete();
                    } catch (delErr) { /* ignore */ }
                    const mIdx = memorySubscriptions.findIndex(ms => ms.endpoint === sub.endpoint);
                    if (mIdx >= 0) memorySubscriptions.splice(mIdx, 1);
                }
            }
        });

        await Promise.all(sendPromises);
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