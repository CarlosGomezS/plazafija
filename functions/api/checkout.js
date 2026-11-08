// POST /api/checkout {plan: "month"|"year"} → crea la sesión de pago de Stripe y devuelve su URL
import { json, isConfigured, stripe, body } from "../_lib/core.js";

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) return json({ error: "Pagos aún no configurados", demo: true }, 503);
  const { plan } = await body(request);
  const price = plan === "month" ? env.STRIPE_PRICE_MONTH : env.STRIPE_PRICE_YEAR;
  const origin = new URL(request.url).origin;
  try {
    const session = await stripe(env, "POST", "checkout/sessions", {
      mode: "subscription",
      line_items: { 0: { price, quantity: 1 } },
      success_url: origin + "/?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/?pago=cancelado",
      allow_promotion_codes: "true",
      billing_address_collection: "auto",
      locale: "es"
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout:", e.message);
    return json({ error: "No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos.", detalle: e.message }, 502);
  }
}

// Diagnóstico: abre /api/checkout en el navegador. Comprueba la clave y los precios contra Stripe (no muestra claves).
export async function onRequestGet({ env }) {
  const k = env.STRIPE_SECRET_KEY || "";
  const out = {
    clave: !k ? "falta" : k.startsWith("sk_test_") ? "secreta de PRUEBA (bien)" : k.startsWith("sk_live_") ? "secreta REAL" : k.startsWith("rk_") ? "clave restringida" : k.startsWith("pk_") ? "ERROR: es la clave publicable (pk_), hace falta la secreta (sk_)" : "formato desconocido",
    tokenSecret: (env.TOKEN_SECRET || "").length >= 20 ? "bien" : "falta o es muy corto",
  };
  for (const [nombre, id] of [["precioMensual", env.STRIPE_PRICE_MONTH], ["precioAnual", env.STRIPE_PRICE_YEAR]]) {
    if (!id) { out[nombre] = "falta"; continue; }
    if (!/^price_/.test(id)) { out[nombre] = `ERROR: empieza por «${id.slice(0, 5)}…»; tiene que empezar por price_`; continue; }
    try {
      const p = await stripe(env, "GET", "prices/" + encodeURIComponent(id));
      out[nombre] = `${(p.unit_amount / 100).toFixed(2)} ${String(p.currency).toUpperCase()} · ${p.recurring ? "recurrente cada " + p.recurring.interval : "ERROR: es de pago único, tiene que ser recurrente"} · ${p.active ? "activo" : "ERROR: inactivo"} · ${p.livemode ? "modo real" : "modo prueba"}`;
    } catch (e) { out[nombre] = "Stripe dice: " + e.message; }
  }
  // Intento real de crear una página de pago (en modo prueba no cobra nada y caduca sola)
  if (k && env.STRIPE_PRICE_MONTH) {
    try {
      const sess = await stripe(env, "POST", "checkout/sessions", {
        mode: "subscription", line_items: { 0: { price: env.STRIPE_PRICE_MONTH, quantity: 1 } },
        success_url: "https://example.com/?ok", cancel_url: "https://example.com/?no", allow_promotion_codes: "true", billing_address_collection: "auto", locale: "es"
      });
      out.paginaDePago = sess.url ? "se crea bien" : "sin URL";
    } catch (e) { out.paginaDePago = "Stripe dice: " + e.message; }
  }
  return json(out);
}
