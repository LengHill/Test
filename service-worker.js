// Назва кешу. Змінюйте при кожному оновленні, щоб оновити кеш у користувачів.
const CACHE_NAME = 'finance-tracker-v3'; // Оновлено для примусового оновлення

// Ресурси, які будуть кешовані (включаючи CDN)
const urlsToCache = [
  './', // Дуже важливо, щоб кешувати кореневий шлях
  './index.html',
  './finance_manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
];

// 1. Подія встановлення: відкриття кешу та завантаження основних ресурсів
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Opened cache. Pre-caching files...');
        // Кешування ресурсів
        return cache.addAll(urlsToCache).catch(err => {
            console.error('[Service Worker] Failed to pre-cache some resources:', err);
            // Якщо цей крок не спрацює, PWA не працюватиме офлайн
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
  // Забезпечення негайного контролю над клієнтами PWA
  event.waitUntil(self.clients.claim()); 
});

// 3. Подія отримання: обслуговування з кешу, а потім з мережі
self.addEventListener('fetch', (event) => {
  // Завжди йдемо до мережі для Firebase, оскільки дані мають бути актуальними
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('auth.googleapis.com')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Якщо кеш містить відповідь, повертаємо її
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        // Якщо відповіді немає, йдемо до мережі
        return fetch(event.request)
          .then((response) => {
            // Перевіряємо, чи отримано дійсну відповідь
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонуємо відповідь, оскільки вона може бути прочитана лише один раз
            const responseToCache = response.clone();

            // Кешуємо нові запити
            caches.open(CACHE_NAME)
              .then((cache) => {
                if (event.request.url.startsWith('http')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed and no cache available:', error);
            // Якщо тут помилка, це означає, що файл не був кешований і немає зв'язку.
          });
      })
  );
});