
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Yeni Bildirim";
  const body = data.body || "";
  const icon = data.icon || "/logo.png";
  const url = data.data?.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/logo.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this URL
      for (let client of windowClients) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
