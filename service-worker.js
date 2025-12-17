// service-worker.js

self.addEventListener('push', function(event) {
    const data = event.data.json();
    console.log('Notificación Push recibida:', data);
    
    // Opciones para mostrar la notificación
    const options = {
        body: data.body,
        icon: '/logo192.png', // Asegúrate de que esta ruta exista
        badge: '/badge.png',  // Icono para dispositivos Android
        vibrate: [200, 100, 200, 100],
        data: {
            url: data.url || '/' // URL a abrir al hacer clic
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // Abrir la URL al hacer clic en la notificación
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
