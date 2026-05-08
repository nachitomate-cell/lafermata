self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🎉 ¡Tu pedido está listo!';
  const options = {
    body: data.body || 'Pasa a retirarlo en Av. Libertad 1040, Viña del Mar',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'order-ready',
    requireInteraction: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
