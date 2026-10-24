// Минимальный сервис-воркер: нужен браузеру для установки приложения; ничего не кэшируем, чтобы не залипали старые версии
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
