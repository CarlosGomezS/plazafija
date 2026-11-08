// POST /api/interes {plan} → mientras los pagos están en pausa, cuenta a quién le interesa Premium y avisa por Telegram.
import { avisarTelegram } from "../_lib/core.js";

const BOTS = /bot|crawl|spider|headless|lighthouse|preview|curl|wget|python/i;

export async function onRequestPost({ request, env }) {
  const ok = () => new Response(null, { status: 204 });
  if (BOTS.test(request.headers.get("user-agent") || "")) return ok();
  let plan = "";
  try { plan = JSON.parse(await request.text()).plan === "month" ? "mensual (4,99 €)" : "anual (29 €)"; } catch { return ok(); }
  let total = null;
  try { if (env.VISITAS) { total = (+(await env.VISITAS.get("interesados")) || 0) + 1; await env.VISITAS.put("interesados", String(total)); } } catch {}
  await avisarTelegram(env, `⭐ Alguien ha pulsado «Suscribirme» · plan ${plan}${total ? `\n📈 Interesados en Premium: ${total}` : ""}\n(Los pagos están en pausa: no se ha cobrado nada)`);
  return ok();
}
