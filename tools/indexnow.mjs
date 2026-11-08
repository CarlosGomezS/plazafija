// Avisa a los buscadores compatibles con IndexNow (Bing, Yandex, Seznam, Naver…) de todas las páginas del sitemap.
// Lo ejecuta el flujo de GitHub después de cada publicación.
import { readFileSync, readdirSync } from "node:fs";
const sitemap = readFileSync("dist/sitemap.xml", "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = new URL(urlList[0]).host;
const keyFile = readdirSync("dist").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.log("Sin clave de IndexNow"); process.exit(0); }
const key = keyFile.slice(0, -4);
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList })
});
console.log(`IndexNow: ${urlList.length} páginas enviadas → respuesta ${r.status} ${r.status === 200 || r.status === 202 ? "(aceptado)" : await r.text()}`);
