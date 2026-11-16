// POST /api/reporte {id, b, q, a, r, c} → un usuario avisa de un posible error en una pregunta; llega al Telegram del titular.
import { json, body, avisarTelegram } from "../_lib/core.js";

const corta = (t, n) => String(t || "").replace(/\s+/g, " ").trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  const d = await body(request);
  if (!d || !d.q) return json({ error: "Falta la pregunta" }, 400);
  // Límite sencillo: como mucho 30 avisos al día en total, para que nadie inunde el Telegram
  try {
    if (env.VISITAS) {
      const k = "reportes:" + new Date().toISOString().slice(0, 10);
      const n = (+(await env.VISITAS.get(k)) || 0) + 1;
      if (n > 30) return json({ ok: true });
      await env.VISITAS.put(k, String(n), { expirationTtl: 172800 });
    }
  } catch {}
  const texto = `⚑ Aviso de error en una pregunta${d.id ? " (" + corta(d.id, 12) + ")" : ""}
📚 Bloque: ${corta(d.b, 10)}
❓ ${corta(d.q, 300)}
✅ Respuesta que da la web: ${corta(d.a, 200)}
📎 Referencia: ${corta(d.r, 80)}
💬 Comentario: ${corta(d.c, 600) || "(sin comentario)"}`;
  await avisarTelegram(env, texto, { tags: ["warning"], priority: 3 });
  return json({ ok: true });
}
