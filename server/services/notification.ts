import webpush from "web-push";
import { db } from "../db";
import { pushSubscriptions, settings as settingsTable, notifications } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
}

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
    webpush.setVapidDetails("mailto:admin@meteorfy.com", publicKey, privateKey);
}

export async function saveSubscription(userId: string, subscription: any) {
    try {
        await db.insert(pushSubscriptions).values({
            userId: userId as any,
            subscription,
            endpoint: subscription.endpoint,
        }).onConflictDoUpdate({
            target: pushSubscriptions.endpoint,
            set: { subscription, userId: userId as any }
        });
        return true;
    } catch (err) {
        console.error("[PUSH] Error saving subscription:", err);
        return false;
    }
}

export async function getSubscriptions(userId: string) {
    return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId as any));
}

export async function sendNotification({ userId, type, title, body, metadata }: any) {
    try {
        const [userSettings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId as any));
        if ((type === "sale_captured" || type === "PURCHASE_APPROVED") && userSettings?.salesNotifications === false) {
            return;
        }

        let finalTitle = title || "Meteorfy";
        let finalBody = body || "Nova notificação";

        if (type === "sale_captured" || type === "PURCHASE_APPROVED") {
            const amount = metadata?.amount || "0.00";
            const currency = metadata?.currency || "USD";
            const productName = metadata?.productName || "";
            finalTitle = "Venda aprovada";
            finalBody = productName ? `${productName} — ${currency} ${amount}` : `Valor: ${currency} ${amount}`;
        }

        await db.insert(notifications).values({
            userId: userId as any,
            type,
            title: finalTitle,
            body: finalBody,
        });

        const subs = await getSubscriptions(userId);
        const payload = JSON.stringify({ title: finalTitle, body: finalBody, icon: "/notification-icon.png" });

        await Promise.all(subs.map(async (sub) => {
            try {
                await webpush.sendNotification(sub.subscription as any, payload);
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
                }
            }
        }));
        return true;
    } catch (error) {
        console.error("[PUSH] Global error in sendNotification:", error);
        return false;
    }
}