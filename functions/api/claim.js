// POST /api/claim {session_id} → tras pagar, verifica la sesión en Stripe y entrega el acceso Premium
import { json, isConfigured, stripe, signToken, accessCode, body } from "../_lib/core.js";

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
    return json({ token: await signToken(env.TOKEN_SECRET, customer.id), code, email });
  } catch (e) {
    return json({ error: "No se pudo verificar el pago. Recarga la página en un momento." }, 502);
  }
}
