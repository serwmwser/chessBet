// Минимальный сервис-воркер: нужен браузеру для установки приложения; ничего не кэшируем, чтобы не залипали старые версии
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

// HiMeet push: показ уведомлений о звонках и сообщениях
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { /* пустое уведомление */ }
  e.waitUntil(self.registration.showNotification(d.title || "HiMeet", {
    body: d.body || "", tag: d.tag || "hm", renotify: true, icon: "/icon-192.png", badge: "/icon-192.png",
    data: { url: d.url || "/" }, requireInteraction: !!d.call, vibrate: d.call ? [300, 200, 300, 200, 300] : [100],
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) {
      try { await c.focus(); if ("navigate" in c) await c.navigate(url); return; } catch (_) { /* пробуем следующее окно */ }
    }
    await self.clients.openWindow(url);
  })());
});
