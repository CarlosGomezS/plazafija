// POST /api/claim {session_id} → tras pagar, verifica la sesión en Stripe y entrega el acceso Premium
import { json, isConfigured, stripe, signToken, accessCode, body, avisarTelegram } from "../_lib/core.js";

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) return json({ error: "Pagos aún no configurados", demo: true }, 503);
  const { session_id } = await body(request);
  if (!/^cs_[A-Za-z0-9_]+$/.test(session_id || "")) return json({ error: "Sesión de pago no válida." }, 400);
  try {
    const s = await stripe(env, "GET", "checkout/sessions/" + session_id, { expand: { 0: "subscription", 1: "customer" } });
    const active = s.status === "complete" && s.subscription && ["active", "trialing"].includes(s.subscription.status);
    if (!active) return json({ error: "El pago todavía no figura como completado. Espera un minuto y recarga la página." }, 402);
    const customer = s.customer;
    let code = customer.metadata?.access_code;
    if (!code) {
      code = accessCode();
      await stripe(env, "POST", "customers/" + customer.id, { metadata: { access_code: code } });
    }
    const email = customer.email || s.customer_details?.email || "";
    await avisarSuscripcion(env, s, email);
    return json({ token: await signToken(env.TOKEN_SECRET, customer.id), code, email });
  } catch (e) {
    return json({ error: "No se pudo verificar el pago. Recarga la página en un momento." }, 502);
  }
}

// Aviso «💰 Nueva suscripción» por Telegram, una sola vez por pago (el almacén VISITAS evita repetirlo si se recarga la página).
const oculta = (e) => e.replace(/^(.{2})[^@]*(@.*)$/, "$1***$2");
async function avisarSuscripcion(env, s, email) {
  try {
    const clave = "aviso-pago:" + s.id;
    if (env.VISITAS) { if (await env.VISITAS.get(clave)) return; await env.VISITAS.put(clave, "1", { expirationTtl: 60 * 60 * 24 * 90 }); }
    const intervalo = s.subscription?.items?.data?.[0]?.price?.recurring?.interval || s.subscription?.plan?.interval;
    const plan = intervalo === "year" ? "anual" : intervalo === "month" ? "mensual" : "";
    const importe = typeof s.amount_total === "number" ? (s.amount_total / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 }) + " €" : "";
    let total = null;
    if (env.VISITAS) { total = (+(await env.VISITAS.get("suscripciones")) || 0) + 1; await env.VISITAS.put("suscripciones", String(total)); }
    const prueba = s.livemode === false ? "\n🧪 Pago de PRUEBA (no es dinero real)" : "";
    await avisarTelegram(env, `💰 Nueva suscripción ${plan}${importe ? " · " + importe : ""}\n👤 ${email ? oculta(email) : "sin email"}${total ? "\n📈 Suscripciones registradas: " + total : ""}${prueba}`);
  } catch { /* el aviso nunca debe impedir el acceso */ }
}
