// POST /api/portal {token} → abre el portal de Stripe para cambiar tarjeta o cancelar la suscripción
import { json, isConfigured, readToken, stripe, body } from "../_lib/core.js";

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) return json({ error: "Pagos aún no configurados", demo: true }, 503);
  const { token } = await body(request);
  const t = await readToken(env.TOKEN_SECRET, token);
  if (!t) return json({ error: "Acceso no válido." }, 401);
  try {
    const s = await stripe(env, "POST", "billing_portal/sessions", { customer: t.c, return_url: new URL(request.url).origin + "/" });
    return json({ url: s.url });
  } catch (e) {
    return json({ error: "No se pudo abrir la gestión de la suscripción." }, 502);
  }
}
