// Pruebas automáticas: node test.mjs (ejecuta antes el build)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { signToken, readToken, accessCode } from "./functions/_lib/core.js";
import * as checkout from "./functions/api/checkout.js";
import * as claim from "./functions/api/claim.js";
import * as questions from "./functions/api/questions.js";
import * as restore from "./functions/api/restore.js";
import * as visita from "./functions/api/visita.js";

const ENV = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_MONTH: "price_m", STRIPE_PRICE_YEAR: "price_y", TOKEN_SECRET: "secreto-de-prueba-muy-largo" };
const req = (path, body) => new Request("https://plazafija.test/api/" + path, { method: "POST", body: JSON.stringify(body) });

// Simula la API de Stripe
function mockStripe(routes) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    for (const [re, fn] of routes) if (re.test(String(url))) return new Response(JSON.stringify(fn(String(url), opts)), { status: 200 });
    return new Response(JSON.stringify({ error: { message: "no route" } }), { status: 404 });
  };
  return calls;
}

test("token firmado: ida y vuelta", async () => {
  const t = await signToken(ENV.TOKEN_SECRET, "cus_123");
  const r = await readToken(ENV.TOKEN_SECRET, t);
  assert.equal(r.c, "cus_123");
  assert.equal(r.expired, false);
});

test("token manipulado o con otro secreto se rechaza", async () => {
  const t = await signToken(ENV.TOKEN_SECRET, "cus_123");
  const [p, s] = t.split(".");
  const fake = Buffer.from(JSON.stringify({ c: "cus_otro", e: Date.now() + 1e9 })).toString("base64url");
  assert.equal(await readToken(ENV.TOKEN_SECRET, fake + "." + s), null);
  assert.equal(await readToken("otro-secreto", t), null);
  assert.equal(await readToken(ENV.TOKEN_SECRET, "basura"), null);
  assert.ok(p.length > 10);
});

test("código de acceso con formato ABCD-1234", () => {
  for (let i = 0; i < 50; i++) assert.match(accessCode(), /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
});

test("sin claves configuradas, las APIs responden en modo demo", async () => {
  const r = await checkout.onRequestPost({ request: req("checkout", { plan: "year" }), env: {} });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).demo, true);
});

test("checkout crea sesión de suscripción con el precio del plan", async () => {
  const calls = mockStripe([[/checkout\/sessions$/, () => ({ url: "https://checkout.stripe.com/x" })]]);
  const r = await checkout.onRequestPost({ request: req("checkout", { plan: "month" }), env: ENV });
  assert.equal((await r.json()).url, "https://checkout.stripe.com/x");
  const body = decodeURIComponent(calls[0].opts.body);
  assert.match(body, /mode=subscription/);
  assert.match(body, /line_items\[0\]\[price\]=price_m/);
  assert.match(body, /session_id=\{CHECKOUT_SESSION_ID\}/);
});

test("claim entrega token y código tras un pago completado", async () => {
  mockStripe([
    [/checkout\/sessions\/cs_test_1/, () => ({ status: "complete", subscription: { status: "active" }, customer: { id: "cus_9", email: "a@b.es", metadata: {} } })],
    [/customers\/cus_9$/, () => ({ id: "cus_9" })]
  ]);
  const r = await claim.onRequestPost({ request: req("claim", { session_id: "cs_test_1" }), env: ENV });
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.email, "a@b.es");
  assert.match(d.code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal((await readToken(ENV.TOKEN_SECRET, d.token)).c, "cus_9");
});

test("claim rechaza pagos no completados e IDs inválidos", async () => {
  mockStripe([[/checkout\/sessions\//, () => ({ status: "open", subscription: null, customer: { id: "c" } })]]);
  assert.equal((await claim.onRequestPost({ request: req("claim", { session_id: "cs_test_2" }), env: ENV })).status, 402);
  assert.equal((await claim.onRequestPost({ request: req("claim", { session_id: "../../hack" }), env: ENV })).status, 400);
});

test("questions: solo entrega el banco completo con token válido", async () => {
  const good = await signToken(ENV.TOKEN_SECRET, "cus_9");
  const ok = await questions.onRequestPost({ request: req("questions", { token: good }), env: ENV });
  const d = await ok.json();
  assert.equal(ok.status, 200);
  assert.ok(d.questions.length > 200);
  const bad = await questions.onRequestPost({ request: req("questions", { token: "x.y" }), env: ENV });
  assert.equal(bad.status, 401);
});

test("questions: token caducado se renueva solo si la suscripción sigue activa", async () => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(ENV.TOKEN_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const payload = enc({ c: "cus_9", e: Date.now() - 1000 });
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("base64url");
  const expired = payload + "." + sig;
  mockStripe([[/subscriptions/, () => ({ data: [{ status: "canceled" }] })]]);
  assert.equal((await questions.onRequestPost({ request: req("questions", { token: expired }), env: ENV })).status, 402);
  mockStripe([[/subscriptions/, () => ({ data: [{ status: "active" }] })]]);
  const r = await questions.onRequestPost({ request: req("questions", { token: expired }), env: ENV });
  assert.equal(r.status, 200);
  assert.notEqual((await r.json()).token, expired);
});

test("restore exige email y código correctos", async () => {
  mockStripe([
    [/customers\?/, () => ({ data: [{ id: "cus_9", metadata: { access_code: "ABCD-2345" } }] })],
    [/subscriptions/, () => ({ data: [{ status: "active" }] })]
  ]);
  const ok = await restore.onRequestPost({ request: req("restore", { email: "A@b.es ", code: "abcd-2345" }), env: ENV });
  assert.equal(ok.status, 200);
  const no = await restore.onRequestPost({ request: req("restore", { email: "a@b.es", code: "ZZZZ-2345" }), env: ENV });
  assert.equal(no.status, 404);
});

test("psicotécnicos: 500 preguntas generadas son válidas", () => {
  const src = readFileSync("src/psico.js", "utf8");
  const PSI = new Function(src + "; return PSI;")();
  for (const q of PSI(500)) {
    assert.equal(q.o.length, 4, q.q);
    assert.equal(new Set(q.o).size, 4, q.q);
    assert.ok(q.a >= 0 && q.a < 4, q.q);
  }
});

// ---- Contador de visitas con aviso por Telegram ----
const kv = () => { const m = new Map(); return { get: async (k, t) => (m.has(k) ? (t === "json" ? JSON.parse(m.get(k)) : m.get(k)) : null), put: async (k, v) => m.set(k, v), m }; };
const visit = (body, ua = "Mozilla/5.0 (iPhone) Mobile Safari", country = "ES") => {
  const r = new Request("https://plazafija-34s.pages.dev/api/visita", { method: "POST", body: JSON.stringify(body), headers: { "user-agent": ua } });
  Object.defineProperty(r, "cf", { value: { country } });
  return r;
};
const TG = { TELEGRAM_BOT_TOKEN: "123:abc", TELEGRAM_CHAT_ID: "42" };

test("visita: cuenta, avisa por Telegram con página, origen, dispositivo y país", async () => {
  const calls = mockStripe([[/api\.telegram\.org/, () => ({ ok: true })]]);
  const env = { ...TG, VISITAS: kv() };
  await visita.onRequestPost({ request: visit({ p: "/temario/", r: "https://www.google.es/" }), env });
  await visita.onRequestPost({ request: visit({ p: "/", r: "" }, "Mozilla/5.0 (Windows NT 10.0)", "MX"), env });
  assert.equal(calls.length, 2);
  const m1 = JSON.parse(calls[0].opts.body), m2 = JSON.parse(calls[1].opts.body);
  assert.equal(m1.chat_id, "42");
  assert.match(m1.text, /Visita nº 1 de hoy · 1 en total/);
  assert.match(m1.text, /\/temario\//); assert.match(m1.text, /Google/); assert.match(m1.text, /Móvil/); assert.match(m1.text, /ES/);
  assert.match(m2.text, /nº 2 de hoy · 2 en total/); assert.match(m2.text, /Directo/); assert.match(m2.text, /Ordenador/); assert.match(m2.text, /MX/);
});

test("visita: ignora bots y navegación interna; sin almacén avisa sin número", async () => {
  const calls = mockStripe([[/api\.telegram\.org/, () => ({ ok: true })]]);
  await visita.onRequestPost({ request: visit({ p: "/" }, "Googlebot/2.1"), env: { ...TG } });
  await visita.onRequestPost({ request: visit({ p: "/x", r: "https://plazafija-34s.pages.dev/" }), env: { ...TG } });
  assert.equal(calls.length, 0);
  await visita.onRequestPost({ request: visit({ p: "/", r: "https://t.co/abc" }), env: { ...TG } });
  assert.equal(calls.length, 1);
  assert.match(JSON.parse(calls[0].opts.body).text, /Nueva visita[\s\S]*X \(Twitter\)/);
});

test("visita: al cambiar de día manda el resumen de ayer y reinicia el contador diario", async () => {
  const calls = mockStripe([[/api\.telegram\.org/, () => ({ ok: true })]]);
  const store = kv();
  await store.put("contador", JSON.stringify({ dia: "2000-01-01", hoy: 37, total: 500 }));
  await visita.onRequestPost({ request: visit({ p: "/" }), env: { ...TG, VISITAS: store } });
  const texts = calls.map((c) => JSON.parse(c.opts.body).text);
  assert.ok(texts.some((t) => /Resumen del 2000-01-01: 37 visitas/.test(t)));
  assert.ok(texts.some((t) => /nº 1 de hoy · 501 en total/.test(t)));
});

test("visita: con mucho tráfico avisa solo cada 10 visitas", async () => {
  const calls = mockStripe([[/api\.telegram\.org/, () => ({ ok: true })]]);
  const store = kv();
  await store.put("contador", JSON.stringify({ dia: visita.dayKey(), hoy: 150, total: 1000 }));
  for (let i = 0; i < 10; i++) await visita.onRequestPost({ request: visit({ p: "/" }), env: { ...TG, VISITAS: store } });
  assert.equal(calls.length, 1);
  assert.match(JSON.parse(calls[0].opts.body).text, /nº 160 de hoy/);
});

test("claim avisa por Telegram de la suscripción nueva una sola vez", async () => {
  const calls = mockStripe([
    [/checkout\/sessions\/cs_test_2/, () => ({ id: "cs_test_2", livemode: false, amount_total: 2900, status: "complete", subscription: { status: "active", items: { data: [{ price: { recurring: { interval: "year" } } }] } }, customer: { id: "cus_7", email: "carlos@gmail.com", metadata: { access_code: "ABCD-2345" } } })],
    [/api\.telegram\.org/, () => ({ ok: true })]
  ]);
  const env = { ...ENV, ...TG, VISITAS: kv() };
  for (let i = 0; i < 2; i++) assert.equal((await claim.onRequestPost({ request: req("claim", { session_id: "cs_test_2" }), env })).status, 200);
  const tg = calls.filter((c) => /telegram/.test(c.url));
  assert.equal(tg.length, 1);
  const text = JSON.parse(tg[0].opts.body).text;
  assert.match(text, /Nueva suscripción anual · 29,00 €/);
  assert.match(text, /ca\*\*\*@gmail\.com/);
  assert.match(text, /PRUEBA/);
  assert.match(text, /Suscripciones registradas: 1/);
});
