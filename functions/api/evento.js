// POST /api/evento {t, d} → eventos de uso de la app que se avisan al titular (Telegram y ntfy).
// Solo tipos conocidos y con un tope diario por tipo, para que nadie pueda inundar las notificaciones.
import { json, body, notificar } from "../_lib/core.js";

const BOTS = /bot|crawl|spider|headless|lighthouse|preview|curl|wget|python/i;
const TIPOS = {
  examen_inicio: (d) => [`📝 Alguien empieza el examen oficial ${d.anio || ""}`, ["memo"], 3],
  examen_fin: (d) => [`🏁 Examen oficial ${d.anio || ""} terminado · nota ${d.nota ?? "?"}\nAciertos ${d.ok ?? "?"} · fallos ${d.ko ?? "?"} · en blanco ${d.blank ?? "?"}`, ["checkered_flag"], 3],
  test_fin: (d) => [`✅ Test terminado (${d.modo || "test"}) · nota ${d.nota ?? "?"}`, ["white_check_mark"], 2],
  planes_ver: (d) => [`👀 Alguien está mirando los planes Premium\nMotivo: ${d.motivo || "—"}`, ["eyes"], 3],
  pago_abandonado: () => [`↩️ Alguien ha vuelto de Stripe sin pagar\nAbrió la página de pago y la canceló.`, ["leftwards_arrow_with_hook"], 4],
  limite_diario: () => [`🔒 Alguien ha gastado sus preguntas gratis de hoy`, ["lock"], 3]
};
const corta = (v) => String(v ?? "").slice(0, 60);

export async function onRequestPost({ request, env }) {
  if (BOTS.test(request.headers.get("user-agent") || "")) return json({ ok: true });
  const { t, d = {} } = (await body(request)) || {};
  const f = TIPOS[t];
  if (!f) return json({ error: "Evento desconocido" }, 400);
  try {
    if (env.VISITAS) {
      const k = `evento:${t}:${new Date().toISOString().slice(0, 10)}`;
      const n = (+(await env.VISITAS.get(k)) || 0) + 1;
      await env.VISITAS.put(k, String(n), { expirationTtl: 172800 });
      if (n > 150) return json({ ok: true });
    }
  } catch {}
  const datos = Object.fromEntries(Object.entries(d).slice(0, 8).map(([k, v]) => [k, corta(v)]));
  const [texto, tags, priority] = f(datos);
  await notificar(env, texto, { tags, priority });
  return json({ ok: true });
}
