// Meteorfy Pure PWA Push (VAPID + Web Push API)
// No Firebase dependencies!

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
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

  // Request permission first
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
    throw new Error(`Falha ao registrar service worker: ${swErr?.message || swErr}`);
  }

  // Wait for SW to be ready
  await navigator.serviceWorker.ready;

  // Fetch VAPID Key from backend
  let publicKey = cachedPublicKey;
  if (!publicKey) {
    try {
      const response = await fetch("/api/push/public-key");
      const json = await response.json();
      publicKey = json.publicKey;
      if (!publicKey) throw new Error("Servidor não retornou chave pública VAPID.");
      cachedPublicKey = publicKey;
    } catch (keyErr: any) {
      throw new Error(`Falha ao obter chave do servidor: ${keyErr?.message || keyErr}`);
    }
  }

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);

  // Subscribe to push
  let subscription: PushSubscription;
  try {
    // Check if existing subscription exists with different key
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      const currentSubKey = existingSub.options.applicationServerKey;
      const newKey = convertedVapidKey.buffer;

      // If keys are different, we MUST unsubscribe first
      if (currentSubKey && currentSubKey.byteLength !== newKey.byteLength) {
        console.log("[Push] Key mismatch detected, unsubscribing old one...");
        await existingSub.unsubscribe();
      }
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
    console.log("[Push] Subscribed to push");
  } catch (subErr: any) {
    // If it's a key mismatch error, try one last time with force unsubscribe
    if (subErr.name === "InvalidStateError" || subErr.message?.includes("applicationServerKey")) {
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    } else {
      throw new Error(`Falha ao subscrever push: ${subErr?.message || subErr}`);
    }
  }

  // Send subscription to backend
  try {
    const idToken = await (await import("firebase/auth")).getIdToken(user);
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({
        subscription,
        userId: user.uid,
      }),
    });
    console.log("[Push] Subscription saved on server");
  } catch (saveErr: any) {
    throw new Error(`Falha ao guardar subscrição no servidor: ${saveErr?.message || saveErr}`);
  }

  return true;
}

export async function disablePush(user: any): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Remove from backend
    const idToken = await (await import("firebase/auth")).getIdToken(user);
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId: user.uid }),
    });

    console.log("[Push] Push disabled and subscription removed");
  } catch (err) {
    console.error("[Push] Error disabling push:", err);
  }
}