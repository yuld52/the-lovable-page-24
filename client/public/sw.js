const CACHE_NAME = "meteorfy-v2";
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/manifest.json",
    "/favicon.png"
];

self.addEventListener("install", (event) => {
    self.skipWaiting(); // Activate new SW immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

self.addEventListener("fetch", (event) => {
    // For navigation requests (HTML pages), use network-first to avoid white screen
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => caches.match("/index.html"))
        );
        return;
    }

    // For other requests, cache-first
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener("push", function (event) {
    let data = { title: "Nova Atualização", body: "Você recebeu uma nova notificação." };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error("Push data is not JSON:", e);
    }

    self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/notification-icon.png",
        badge: "/notification-icon.png",
        vibrate: [200, 100, 200],
        tag: "meteorfy-notification",
        renotify: true,
        data: {
            url: data.url || "/"
        },
        timestamp: Date.now()
    });
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || "/")
    );
});
