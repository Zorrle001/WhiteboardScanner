const CACHE_NAME = "whiteboard-scanner-cache-v2";
//const FILES_TO_CACHE = ["/", "/index.html", "/styles.css", "/script.js"];

const FILES_TO_CACHE = [
    // LOCALS
    "index.html",
    "js/WhiteboardScanner.js",
    "less/master.less",
    "less/styles.less",
    "manifest.json",

    // REMOTE
    /*"https://cdn.jsdelivr.net/npm/less",
    "https://kit.fontawesome.com/452b801551.js",
    "https://docs.opencv.org/4.7.0/opencv.js",
    "https://cdn.jsdelivr.net/gh/ColonelParrot/jscanify@master/src/jscanify.min.js",
    "https://ka-f.fontawesome.com/releases/v6.7.2/css/free.min.css?token=452b801551",
    "https://ka-f.fontawesome.com/releases/v6.7.2/css/free-v4-shims.min.css?token=452b801551",
    "https://ka-f.fontawesome.com/releases/v6.7.2/css/free-v5-font-face.min.css?token=452b801551",
    "https://ka-f.fontawesome.com/releases/v6.7.2/css/free-v4-font-face.min.css?token=452b801551",
    "https://fonts.googleapis.com/css2?family=Fira+Sans+Condensed:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap",
    "https://fonts.gstatic.com/s/firasanscondensed/v10/wEOhEADFm8hSaQTFG18FErVhsC9x-tarUfbtrQ.woff2",
    "https://ka-f.fontawesome.com/releases/v6.7.2/webfonts/free-fa-solid-900.woff2",*/
];

/*
https://127.0.0.1:5500/html/WhiteboardScanner.html
https://cdn.jsdelivr.net/npm/less
https://kit.fontawesome.com/452b801551.js
https://docs.opencv.org/4.7.0/opencv.js
https://cdn.jsdelivr.net/gh/ColonelParrot/jscanify@master/src/jscanify.min.js
https://127.0.0.1:5500/js/WhiteboardScanner.js
https://127.0.0.1:5500/rsc/firefox.jpg
https://127.0.0.1:5500/less/master.less
https://127.0.0.1:5500/less/styles.less
https://ka-f.fontawesome.com/releases/v6.7.2/css/free.min.css?token=452b801551
https://ka-f.fontawesome.com/releases/v6.7.2/css/free-v4-shims.min.css?token=452b801551
https://ka-f.fontawesome.com/releases/v6.7.2/css/free-v5-font-face.min.css?token=452b801551
https://ka-f.fontawesome.com/releases/v6.7.2/css/free-v4-font-face.min.css?token=452b801551
wss://127.0.0.1:5500/html/WhiteboardScanner.html/ws
https://fonts.googleapis.com/css2?family=Fira+Sans+Condensed:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap
chrome-extension://agjnjboanicjcpenljmaaigopkgdnihi/content-scripts/notification.css
https://fonts.gstatic.com/s/firasanscondensed/v10/wEOhEADFm8hSaQTFG18FErVhsC9x-tarUfbtrQ.woff2
https://ka-f.fontawesome.com/releases/v6.7.2/webfonts/free-fa-solid-900.woff2
https://127.0.0.1:5500/manifest.json
*/

// Installations-Ereignis: Dateien in den Cache speichern
self.addEventListener("install", (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                return cache.addAll(FILES_TO_CACHE);
            }),
            self.skipWaiting(), // Sofort aktivieren, ohne auf die nächste Seite zu warten
        ])
    );
});

// Fetch-Ereignis: Online bevorzugen, aber Cache als Fallback
self.addEventListener("fetch", (event) => {
    console.log("FETCH:", event.request.url);

    if (event.request.method === "POST") {
        // POST-Anfragen nicht cachen, direkt aus dem Netz antworten
        console.log("POST-Anfrage, wird nicht gecacht:", event.request.url);
        event.respondWith(fetch(event.request));
        return; // Keine weitere Verarbeitung notwendig, POST wird direkt aus dem Netz geholt
    }

    event.respondWith(
        fetch(event.request) // Versucht die Datei aus dem Netz zu holen
            .then((response) => {
                console.log("Netzwerk-Response: " + event.request.url);
                // Speichert die neue Datei im Cache und gibt sie zurück
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => {
                // Falls offline, verwende den Cache
                return caches.match(event.request);
            })
    );
});

// Aktivierungs-Ereignis: Alten Cache löschen, wenn Version geändert wird
self.addEventListener("activate", (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_NAME) {
                            return caches.delete(key);
                        }
                    })
                );
            }),
            clients.claim(),
        ])
    );
});

self.addEventListener("push", (event) => {
    const payload = event.data?.json() ?? {
        title: "WhiteboardScanner",
        body: "Notification payload not found",
    };
    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: "icons/PushShare.png",
            badge: "icons/PushShare.png",
            lang: "de-DE",
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.preventDefault();

    let distUrl =
        self.location.origin +
        "?pushShareID=" +
        encodeURIComponent(event.notification.body);
    console.log("Notification clicked Event:", event);

    event.notification.close();

    event.waitUntil(self.clients.openWindow(distUrl));
    return;

    /* event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                if (clients.length > 0) {
                    const client = clients[0];
                    client.navigate(distUrl);
                    client.focus();
                    return;
                } else event.waitUntil(self.clients.openWindow(distUrl));
            })
    ); */

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientsArr) => {
                /* for (const client of clientsArr) {
                    // Try focusing an existing tab
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(distUrl);
                        client.focus();
                        console.log("Client navigate & focus to:", distUrl);
                        return;
                    }
                } */
                // Else, open new tab
                console.log("Client open Window non catch:", distUrl);
                return self.clients.openWindow(distUrl);
            })
            .catch(() => {
                // Fallback for iOS issues
                console.log("Client open Window WITH catch:", distUrl);
                return self.clients.openWindow(distUrl);
            })
    );
});
