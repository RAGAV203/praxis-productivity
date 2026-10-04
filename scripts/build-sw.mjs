// Post-build: writes out/sw.js with a precache manifest of every exported file, so the
// whole app works offline after the first visit.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
const walk = (dir, acc = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

// Next 16 static export writes segment-prefetch payloads as nested folders
// (money/budgets/__next.money/budgets/__PAGE__.txt) while the client requests a flat,
// dotted name (money/budgets/__next.money.budgets.__PAGE__.txt). Write the flat copies.
let flattened = 0;
for (const f of walk(OUT)) {
  const parts = relative(OUT, f).split(sep);
  const i = parts.findIndex((p) => p.startsWith("__next."));
  if (i === -1 || i === parts.length - 1) continue;
  const flat = join(OUT, ...parts.slice(0, i), parts.slice(i).join("."));
  if (!existsSync(flat)) {
    copyFileSync(f, flat);
    flattened++;
  }
}
console.log(`flattened ${flattened} prefetch payloads`);

const files = walk(OUT);

const hash = createHash("sha256");
const urls = [];
for (const f of files) {
  const rel = "/" + relative(OUT, f).split(sep).join("/");
  if (rel === "/sw.js" || rel.endsWith(".txt") && !rel.includes("_next")) continue;
  hash.update(rel).update(readFileSync(f));
  urls.push(rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel);
}
const version = hash.digest("hex").slice(0, 12);

const sw = `/* Praxis service worker — generated ${new Date().toISOString()} */
const CACHE = "praxis-${version}";
const PRECACHE = ${JSON.stringify(urls)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("praxis-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: serve the cached shell instantly (query strings ignored), refresh in background.
  if (req.mode === "navigate") {
    let path = url.pathname;
    if (!path.endsWith("/") && !path.includes(".")) path += "/";
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = (await c.match(path)) || (await c.match("/"));
        const net = fetch(req).then((res) => { if (res.ok) c.put(path, res.clone()); return res; }).catch(() => null);
        return hit || (await net) || new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // Static assets & RSC payloads: cache first, then network.
  e.respondWith(
    caches.match(req, { ignoreSearch: url.pathname.endsWith(".txt") }).then(
      (hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
    )
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow("/"))));
});
`;
writeFileSync(join(OUT, "sw.js"), sw);
console.log(`sw.js: ${urls.length} files precached (version ${version})`);
