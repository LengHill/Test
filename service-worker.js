// Назва кешу. Змінено на v4 для примусового оновлення
const CACHE_NAME = 'finance-tracker-v4'; 

// Ресурси, які будуть кешовані (включаючи НОВІ CDN Firebase COMPAT)
const urlsToCache = [
  './', 
  './index.html',
  './finance_manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  // НОВІ СУМІСНІ CDN-ПОСИЛАННЯ
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js'
];

// 1. Подія встановлення: відкриття кешу та завантаження основних ресурсів
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Opened cache. Pre-caching files...');
        return cache.addAll(urlsToCache).catch(err => {
            console.error('[Service Worker] Failed to pre-cache some resources (This will break offline):', err);
        });
      })
  );
  // Забезпечення негайної активації, щоб уникнути "waiting"
  self.skipWaiting();
});

// 2. Подія активації: очищення старого кешу
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim()); 
});

// 3. Подія отримання: обслуговування з кешу, а потім з мережі
self.addEventListener('fetch', (event) => {
  // Не кешуємо виклики Firebase API
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('auth.googleapis.com')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                if (event.request.url.startsWith('http')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch((error) => {
            // Це спрацює, якщо кеш порожній і немає мережі.
            console.error('[Service Worker] Fetch failed and no cache available:', error);
            // Ви можете додати тут повернення офлайн-сторінки, якщо вона існує
          });
      })
  );
});
