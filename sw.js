var CACHE_NAME = 'lolas-brushy-time-v2';
var OFFLINE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/brushy-background.png',
  './assets/short-brushy-brush.mp3'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(OFFLINE_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name !== CACHE_NAME) {
          return caches.delete(name);
        }
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        if (event.request.headers.has('range')) {
          return createRangeResponse(event.request, cached);
        }
        return cached;
      }

      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, copy);
        });
        return response;
      });
    })
  );
});

function createRangeResponse(request, response) {
  var range = request.headers.get('range').match(/bytes=(\d+)-(\d*)/);

  if (!range) {
    return response;
  }

  return response.arrayBuffer().then(function (buffer) {
    var start = Number(range[1]);
    var requestedEnd = range[2] ? Number(range[2]) : buffer.byteLength - 1;
    var end = Math.min(requestedEnd, buffer.byteLength - 1);
    var headers = new Headers(response.headers);

    headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + buffer.byteLength);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Accept-Ranges', 'bytes');

    return new Response(buffer.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: headers
    });
  });
}
