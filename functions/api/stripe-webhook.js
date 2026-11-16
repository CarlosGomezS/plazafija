// POST /api/stripe-webhook → Stripe avisa aquí de renovaciones, cancelaciones y pagos fallidos.
// Necesita STRIPE_WEBHOOK_SECRET (whsec_…), que da Stripe al crear el webhook. Se comprueba la firma de cada aviso.
import { notificar } from "../_lib/core.js";

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function firmaValida(secret, payload, header, ahora = Date.now()) {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")).filter((p) => p.length === 2 && p[0] === "t"));
  const t = parts.t, firmas = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !firmas.length || Math.abs(ahora / 1000 - +t) > 600) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperada = hex(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`)));
  return firmas.includes(esperada);
}
const euros = (c) => typeof c === "number" ? (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " €" : "";
const oculta = (e) => (e || "").replace(/^(.{2})[^@]*(@.*)$/, "$1***$2") || "sin email";
const plan = (o) => { const i = o?.items?.data?.[0]?.price?.recurring?.interval || o?.lines?.data?.[0]?.price?.recurring?.interval; return i === "year" ? "anual" : i === "month" ? "mensual" : ""; };
const fecha = (s) => s ? new Date(s * 1000).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }) : "";

export function mensaje(ev) {
  const o = ev.data?.object || {}, prev = ev.data?.previous_attributes || {};
  const prueba = ev.livemode === false ? "\n🧪 Modo de PRUEBA" : "";
  switch (ev.type) {
    case "invoice.paid":
      if (o.billing_reason === "subscription_create") return null; // el alta ya se avisa desde la web
      return [`🔁 Renovación cobrada · ${plan(o)} · ${euros(o.amount_paid)}\n👤 ${oculta(o.customer_email)}${prueba}`, ["moneybag"], 4];
    case "invoice.payment_failed":
      return [`⚠️ Pago fallido · ${euros(o.amount_due)}\n👤 ${oculta(o.customer_email)}\nStripe reintentará el cobro.${prueba}`, ["warning"], 5];
    case "customer.subscription.updated":
      if (o.cancel_at_period_end && prev.cancel_at_period_end === false)
        return [`❌ Suscripción cancelada · ${plan(o)}\nMantiene el acceso hasta el ${fecha(o.current_period_end || o.cancel_at)}.${prueba}`, ["x"], 4];
      if (o.cancel_at_period_end === false && prev.cancel_at_period_end === true)
        return [`♻️ Ha anulado la cancelación · ${plan(o)}\nSigue suscrito.${prueba}`, ["recycle"], 4];
      return null;
    case "customer.subscription.deleted":
      return [`👋 Suscripción terminada · ${plan(o)}\nYa no es Premium.${prueba}`, ["wave"], 4];
    case "charge.refunded":
      return [`💸 Reembolso · ${euros(o.amount_refunded)}${prueba}`, ["money_with_wings"], 4];
    case "charge.dispute.created":
      return [`🚨 Reclamación (disputa) de un cobro · ${euros(o.amount)}\nRevísalo en Stripe cuanto antes.${prueba}`, ["rotating_light"], 5];
    default:
      return null;
  }
}

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  if (!(await firmaValida(env.STRIPE_WEBHOOK_SECRET, payload, request.headers.get("stripe-signature"))))
    return new Response("Firma no válida", { status: 400 });
  let ev; try { ev = JSON.parse(payload); } catch { return new Response("JSON no válido", { status: 400 }); }
  const m = mensaje(ev);
  if (m) await notificar(env, m[0], { tags: m[1], priority: m[2] });
  return new Response("ok");
}
