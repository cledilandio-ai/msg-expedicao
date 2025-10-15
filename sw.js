// ✅ MUDE A VERSÃO A CADA NOVO DEPLOY!
const STATIC_CACHE_NAME = 'operacao-cache-v25'; // Use sempre a próxima versão
const DATA_CACHE_NAME = 'data-cache-v1';

// ✅ CORRIGIDO: Adicionados os arquivos essenciais para a instalação do PWA
const FILES_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Evento de 'install': salva os arquivos do "App Shell" no cache.
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Instalando...');
  
  evt.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pré-cacheando o App Shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

// Evento de 'activate': limpa caches antigos para evitar conflitos.
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Ativando...');
  
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== STATIC_CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removendo cache antigo', key);
          return caches.delete(key);
        }
      }));
    })
  );

  self.clients.claim();
});

// Evento de 'fetch': intercepta as requisições de rede.
self.addEventListener('fetch', (evt) => {
  const url = evt.request.url;

  // Estratégia para a API do Google Sheets: Tenta a rede primeiro, se falhar, usa o cache.
  if (url.includes('docs.google.com/spreadsheets')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(evt.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch((err) => {
            return cache.match(evt.request);
          });
      })
    );
    return;
  }

  // Estratégia para os arquivos do App: Tenta o cache primeiro, se falhar, vai para a rede.
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});