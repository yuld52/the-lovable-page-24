import { apiRequest } from "@/lib/queryClient";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

export async function enablePush(user: any): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Browser não suporta notificações push.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Permissão negada.");

    const registration = await navigator.serviceWorker.ready;
    const response = await apiRequest("GET", "/api/push/public-key");
    const { publicKey } = await response.json();

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await apiRequest("POST", "/api/push/subscribe", {
        subscription,
        userId: String(user.id),
    });

    return true;
}