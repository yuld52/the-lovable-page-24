// Meteorfy Push Notification Service Worker
// Configurado para Firebase Cloud Messaging

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Configuração do Firebase (mesma do app)
const firebaseConfig = {
  apiKey: "AIzaSyD_DUO1UFAhh6bNOBWZScrVnXj3Z4GowPU",
  authDomain: "meteorfy1.firebaseapp.com",
  projectId: "meteorfy1",
  storageBucket: "meteorfy1.firebasestorage.app",
  messagingSenderId: "94841260635",
  appId: "1:94841260635:web:6b0742b301256f644c0d7e"
};

firebase.initializeApp(firebaseConfig);

// Inicializa o Firebase Messaging no Service Worker
const messaging = firebase.messaging();

// Lida com notificações em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Notificação em segundo plano recebida:", payload);

  const notificationTitle = payload.notification?.title || "Meteorfy";
  const notificationOptions = {
    body: payload.notification?.body || "Nova notificação",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data,
    vibrate: [200, 100, 200],
    tag: "meteorfy-notification",
    renotify: true,
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lida com cliques na notificação
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notificação clicada:", event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});