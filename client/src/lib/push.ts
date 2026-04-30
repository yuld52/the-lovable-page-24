
import { apiRequest } from "@/lib/queryClient";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

let cachedPublicKey: string | null = null;

export async function enablePush(user: any): Promise<boolean> {
    if (!("serviceWorker" in navigator)) {
        throw new Error("O seu browser não suporta notificações push.");
    }

    if (!("PushManager" in window)) {
        throw new Error("O seu browser não suporta Push API.");
    }

    // Request permission first — before registering SW
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
        throw new Error("Permissão de notificações bloqueada no browser. Desbloqueie nas definições do site.");
    }
    if (permission !== "granted") {
        throw new Error("Permissão de notificações não concedida.");
    }

    // Register service worker
    let registration: ServiceWorkerRegistration;
    try {
        registration = await navigator.serviceWorker.register("/sw.js");
        console.log("[Push] SW Registered");
    } catch (swErr: any) {
        throw new Error(`Falha ao registar service worker: ${swErr?.message || swErr}`);
    }

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;

    // Fetch VAPID Key from backend (use cache if available)
    let publicKey = cachedPublicKey;
    if (!publicKey) {
      try {
          const response = await apiRequest("GET", "/api/push/public-key");
          const json = await response.json();
          publicKey = json.publicKey;
          if (!publicKey) throw new Error("Servidor não retornou chave pública VAPID.");
          cachedPublicKey = publicKey;
      } catch (keyErr: any) {
          throw new Error(`Falha ao obter chave do servidor: ${keyErr?.message || keyErr}`);
      }
    }

    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    const pushManager = (registration as any).pushManager as PushManager;

    // Subscribe to push
    let subscription: PushSubscription;
    try {
        // Check if existing subscription exists with different key
        const existingSub = await pushManager.getSubscription();
        if (existingSub) {
            const currentSubKey = existingSub.options.applicationServerKey;
            const newKey = convertedVapidKey.buffer;
            
            // If keys are different, we MUST unsubscribe first
            // Note: simple buffer comparison isn't perfect in JS but good enough here
            if (currentSubKey && currentSubKey.byteLength !== newKey.byteLength) {
                console.log("[Push] Key mismatch detected, unsubscribing old one...");
                await existingSub.unsubscribe();
            }
        }

        subscription = await pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
        });
        console.log("[Push] Subscribed to push");
    } catch (subErr: any) {
        // If it's a key mismatch error, try one last time with force unsubscribe
        if (subErr.name === "InvalidStateError" || subErr.message?.includes("applicationServerKey")) {
             const existing = await pushManager.getSubscription();
             if (existing) await existing.unsubscribe();
             subscription = await pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey,
             });
        } else {
            throw new Error(`Falha ao subscrever push: ${subErr?.message || subErr}`);
        }
    }

    // Send subscription to backend
    try {
        await apiRequest("POST", "/api/push/subscribe", {
            subscription,
            userId: user.uid,
        });
        console.log("[Push] Subscription saved on server");
    } catch (saveErr: any) {
        throw new Error(`Falha ao guardar subscrição no servidor: ${saveErr?.message || saveErr}`);
    }

    return true;
}
