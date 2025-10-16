// ===================================================================
// SERVICE WORKER UNIFICADO
// ===================================================================

// --- Configuração do Cache ---

// MUDE A VERSÃO A CADA NOVO DEPLOY! (ex: v2, v3, v4...)
// Isso força o navegador a baixar os novos arquivos do aplicativo.
const STATIC_CACHE_NAME = 'unificado-cache-v6'; 

// Nome do cache para os dados das planilhas. Não precisa mudar.
const DATA_CACHE_NAME = 'data-cache-v1';

// Lista completa de todos os arquivos que compõem o "esqueleto" do PWA.
const FILES_TO_CACHE = [
  '/', // A raiz do site
  'index.html',
  'cafe.html',
  'style.css',
  'shared.js',
  'operacao.js',
  'cafe.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];


// --- Ciclo de Vida do Service Worker ---

// 1. Evento 'install': Disparado quando o navegador instala o SW pela primeira vez.
self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Instalando...');
  // Espera até que o cache estático seja aberto e todos os arquivos sejam salvos.
  evt.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pré-cacheando o App Shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Força o novo Service Worker a se tornar ativo imediatamente.
  self.skipWaiting();
});

// 2. Evento 'activate': Disparado após a instalação, quando o SW assume o controle.
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Ativando...');
  // Espera até que a limpeza de caches antigos seja concluída.
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Se um cache antigo for encontrado (com nome diferente dos atuais), ele é deletado.
        if (key !== STATIC_CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removendo cache antigo', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Assume o controle de todas as abas abertas do site imediatamente.
  self.clients.claim();
});

// 3. Evento 'fetch': Disparado para cada requisição de rede que a página faz.
self.addEventListener('fetch', (evt) => {
  const url = evt.request.url;

  // Estratégia para a API do Google Sheets: "Network First, falling back to Cache"
  // Primeiro tenta a rede. Se falhar, usa a última versão salva no cache.
  if (url.includes('docs.google.com/spreadsheets')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(evt.request)
          .then((response) => {
            // Se a resposta da rede for bem-sucedida, salva uma cópia no cache.
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch((err) => {
            // Se a rede falhar (offline), tenta pegar do cache.
            return cache.match(evt.request);
          });
      })
    );
    return;
  }

  // Estratégia para os arquivos do App: "Cache First"
  // Primeiro tenta pegar do cache. Se não encontrar, vai para a rede.
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );

});
