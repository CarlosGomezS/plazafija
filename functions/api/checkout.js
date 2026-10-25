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
    return json({ error: "No se pudo iniciar el pago. Inténtalo de nuevo en unos minutos." }, 502);
  }
}
