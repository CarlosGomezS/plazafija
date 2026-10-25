// POST /api/restore {email, code} → recupera el acceso Premium en otro dispositivo
import { json, isConfigured, stripe, signToken, hasActiveSubscription, body } from "../_lib/core.js";

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) return json({ error: "Pagos aún no configurados", demo: true }, 503);
  const { email, code } = await body(request);
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanEmail.includes("@") || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleanCode)) {
    return json({ error: "Revisa el email y el código (formato ABCD-1234)." }, 400);
  }
  try {
    const list = await stripe(env, "GET", "customers", { email: cleanEmail, limit: 20 });
    const customer = list.data.find(c => c.metadata?.access_code === cleanCode);
    if (!customer) return json({ error: "No encontramos una suscripción con ese email y código." }, 404);
    if (!(await hasActiveSubscription(env, customer.id))) return json({ error: "Tu suscripción no está activa. Puedes volver a suscribirte cuando quieras." }, 402);
    return json({ token: await signToken(env.TOKEN_SECRET, customer.id), code: cleanCode, email: cleanEmail });
  } catch (e) {
    return json({ error: "No se pudo comprobar la suscripción. Inténtalo de nuevo." }, 502);
  }
}
