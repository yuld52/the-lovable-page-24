import { apiRequest } from "./queryClient";

/**
 * Solicita permissão para notificações nativas do navegador.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    throw new Error("Este navegador não suporta notificações.");
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Envia uma notificação nativa (PWA).
 */
export function sendNotification(title: string, options?: NotificationOptions): void {
  if (!("Notification" in window) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      icon: "/favicon.png",
      badge: "/notification-icon.png",
      ...options,
    });

    if (options?.data?.url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = options.data.url;
      };
    }
  } catch (err) {
    console.error("[PUSH] Erro ao enviar notificação nativa:", err);
  }
}

/**
 * Salva a preferência de notificações no backend (Firestore/Settings).
 */
export async function saveNotificationPreference(userId: string, enabled: boolean): Promise<void> {
  try {
    await apiRequest("POST", "/api/settings", {
      salesNotifications: enabled,
    });
  } catch (err) {
    console.error("[PUSH] Erro ao salvar preferência:", err);
  }
}