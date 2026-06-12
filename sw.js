var CACHE='gorilas-v8';
var URLS=[
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './privacidad.html',
  './terminos.html',
  './contacto.html',
  './acerca.html',
  './blog.html',
  './blog-historia-juegos-artilleria.html',
  './blog-guia-estrategia-arenas.html',
  './blog-como-se-hizo.html',
  './blog-tips-modo-dificil.html'
];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(URLS)}));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }));
  self.clients.claim();
});

self.addEventListener('fetch',function(e){
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r||fetch(e.request).then(function(resp){
        if(resp.status===200){var cl=resp.clone();caches.open(CACHE).then(function(c){c.put(e.request,cl)})}
        return resp;
      });
    }).catch(function(){return caches.match('./index.html')})
  );
});
