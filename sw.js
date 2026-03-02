// Service Worker Básico (Obrigatório para o popup de instalação aparecer)
self.addEventListener('install', (e) => {
    self.skipWaiting(); // Ativa imediatamente
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

// Intercepta requisições de rede para satisfazer as regras PWA do Chrome
self.addEventListener('fetch', (e) => {
    e.respondWith(fetch(e.request).catch(() => new Response('Você está offline.')));
});