import { adminDb } from "./firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

// Envia notificação via Firebase Cloud Messaging (FCM) para um usuário específico
export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    // Busca o token FCM do usuário no Firestore
    const tokenSnap = await adminDb.collection("pushTokens").doc(userId).get();
    
    if (!tokenSnap.exists) {
      console.log(`[PUSH] Usuário ${userId} não tem token FCM registrado.`);
      return false;
    }

    const tokenData = tokenSnap.data();
    const token = tokenData?.token;

    if (!token) {
      console.log(`[PUSH] Token inválido para ${userId}`);
      return false;
    }

    // Envia a mensagem via FCM (servidor)
    const messaging = getMessaging();
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    };

    await messaging.send(message);
    console.log(`[PUSH] Notificação enviada para ${userId}: ${title}`);
    return true;
  } catch (error) {
    console.error("[PUSH] Erro ao enviar notificação:", error);
    return false;
  }
}

// Função auxiliar para notificar venda realizada (pode ser chamada de server/routes.ts)
export async function notifySale(userId: string, productName: string, amount: number, currency: string) {
  return sendPushNotification(
    userId,
    "Venda aprovada!",
    `${productName} — ${currency} ${amount}`,
    { type: "sale_captured", productName, amount: amount.toString(), currency }
  );
}