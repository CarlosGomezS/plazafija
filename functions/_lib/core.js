// Utilidades compartidas por las funciones del servidor (Cloudflare Pages Functions).
// Variables de entorno necesarias (se configuran en el panel de Cloudflare):
//   STRIPE_SECRET_KEY   → clave secreta de Stripe (sk_live_... o sk_test_...)
//   STRIPE_PRICE_MONTH  → ID del precio mensual (price_...)
//   STRIPE_PRICE_YEAR   → ID del precio anual (price_...)
//   TOKEN_SECRET        → cadena aleatoria larga para firmar los accesos

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export const isConfigured = env => Boolean(env.STRIPE_SECRET_KEY && env.TOKEN_SECRET && env.STRIPE_PRICE_MONTH && env.STRIPE_PRICE_YEAR);

// ---- Stripe por API REST (sin librerías) ----
function encode(params, prefix = "", out = []) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}

export async function stripe(env, method, path, params) {
  const url = "https://api.stripe.com/v1/" + path + (method === "GET" && params ? "?" + encode(params) : "");
  const res = await fetch(url, {
    method,
    headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : encode(params || {})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Error de Stripe");
  return data;
}

export async function hasActiveSubscription(env, customerId) {
  const list = await stripe(env, "GET", "subscriptions", { customer: customerId, status: "all", limit: 10 });
  return list.data.some(s => s.status === "active" || s.status === "trialing");
}

// ---- Tokens de acceso firmados (HMAC-SHA256) ----
const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export const TOKEN_DAYS = 3; // cada 3 días se vuelve a comprobar en Stripe que la suscripción sigue activa

export async function signToken(secret, customerId) {
  const payload = b64url(enc.encode(JSON.stringify({ c: customerId, e: Date.now() + TOKEN_DAYS * 86400000 })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return payload + "." + b64url(sig);
}

// Devuelve {c, e, expired} si la firma es válida, o null si no lo es.
export async function readToken(secret, token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return { ...data, expired: data.e < Date.now() };
  } catch { return null; }
}

// Código de acceso legible para recuperar la cuenta en otro dispositivo (sin O/0/I/1)
export function accessCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = [...bytes].map(b => abc[b % abc.length]).join("");
  return s.slice(0, 4) + "-" + s.slice(4);
}

export async function body(request) {
  try { return await request.json(); } catch { return {}; }
}
