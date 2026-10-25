// POST /api/questions {token} → devuelve el banco completo solo a suscriptores con acceso válido
import { json, isConfigured, readToken, signToken, hasActiveSubscription, body } from "../_lib/core.js";
import { PREMIUM } from "../_lib/premium-data.js";

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) return json({ error: "Pagos aún no configurados", demo: true }, 503);
  const { token } = await body(request);
  const t = await readToken(env.TOKEN_SECRET, token);
  if (!t) return json({ error: "Acceso no válido." }, 401);
  let fresh = token;
  if (t.expired) {
    // Cada pocos días se comprueba en Stripe que la suscripción sigue activa
    try {
      if (!(await hasActiveSubscription(env, t.c))) return json({ error: "Tu suscripción ha terminado." }, 402);
      fresh = await signToken(env.TOKEN_SECRET, t.c);
    } catch { return json({ error: "No se pudo comprobar la suscripción." }, 502); }
  }
  return json({ token: fresh, questions: PREMIUM });
}
