const CACHE_NAME = 'poskita-v1.1'; // Ganti ini tiap ada update besar
const ASSETS_TO_CACHE = [
  '/', 
  'index.html',
  'app.js',  // <--- Pastikan semua file JS kamu masuk sini
  'ui.js',
  'db.js',
  'kasir.js',
  'report.js',
  'sync.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm'
];

// 1. INSTALL: Simpan aset ke cache
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Paksa SW baru langsung aktif tanpa nunggu tab ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. ACTIVATE: Hapus cache lama (PENTING!)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Menghapus cache lama:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. FETCH: Network First (Coba internet dulu, kalau gagal baru cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});