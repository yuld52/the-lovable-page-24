import { getToken, onMessage } from "firebase/messaging";
import { app, auth } from "./firebase";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

// Inicializa o Firebase Messaging (apenas em ambiente de browser)
const messaging = typeof window !== "undefined" && "serviceWorker" in navigator
  ? (await import("firebase/messaging")).getMessaging(app)
  : null;

const VAPID_KEY = "BJ6r5XpCkKqdF7lNv6X1v3v3hKq5XpCkKqdF7lNv6X1v3v3hKq5XpCk"; // Substitua pela sua chave pública VAPID do Firebase

export async function enablePush(user: any): Promise<boolean> {
  if (!messaging) {
    throw new Error("O seu browser não suporta notificações push.");
  }

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  try {
    // Solicita permissão
    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      throw new Error("Permissão de notificações bloqueada no browser. Desbloqueie nas definições do site.");
    }

    // Registra o Service Worker se ainda não estiver ativo
    const registration = await navigator.serviceWorker.ready;

    // Obtém o token FCM
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error("Falha ao obter token FCM");
    }

    console.log("[PUSH] Token FCM obtido:", token);

    // Salva o token no Firestore (para o servidor poder enviar notificações depois)
    const db = getFirestore(app);
    await setDoc(doc(db, "pushTokens", user.uid), {
      token,
      createdAt: new Date(),
      platform: "web"
    });

    // Listener para mensagens em primeiro plano
    onMessage(messaging, (payload) => {
      console.log("[PUSH] Mensagem recebida em primeiro plano:", payload);
      if (payload.notification) {
        new Notification(payload.notification.title || "Meteorfy", {
          body: payload.notification.body,
          icon: "/favicon.ico",
        });
      }
    });

    return true;
  } catch (err: any) {
    console.error("[PUSH] Erro ao ativar:", err);
    throw new Error(`Falha ao ativar notificações: ${err.message}`);
  }
}

export async function disablePush(user: any): Promise<void> {
  if (!user) return;

  try {
    const db = getFirestore(app);
    await deleteDoc(doc(db, "pushTokens", user.uid));
    console.log("[PUSH] Token removido");
  } catch (err) {
    console.error("[PUSH] Erro ao desativar:", err);
  }
}