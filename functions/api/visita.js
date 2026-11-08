// Contador de visitas con aviso por Telegram.
// Cada visitante nuevo (una vez por sesión del navegador) envía un aviso a /api/visita.
// Variables necesarias (las sube el flujo de GitHub desde sus secretos):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Almacén: KV con el nombre VISITAS (lo crea el flujo). Sin él, avisa igual pero sin contador.
// No se guarda la IP ni nada que identifique a la persona: solo totales.

const TZ = "Europe/Madrid";
const AVISO_CADA_UNA_HASTA = 150; // a partir de aquí, en un mismo día, avisa cada 10 visitas
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|monitor/i;

export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export function origen(ref, host) {
  if (!ref) return "Directo (enlace guardado o escrito a mano)";
  let h;
  try { h = new URL(ref).hostname.replace(/^www\./, ""); } catch { return "Desconocido"; }
  if (host && h === host) return null; // navegación interna
  const map = [[/google\./, "Google"], [/bing\./, "Bing"], [/duckduckgo/, "DuckDuckGo"], [/yahoo\./, "Yahoo"], [/ecosia/, "Ecosia"],
    [/(^|\.)t\.co$|twitter|x\.com/, "X (Twitter)"], [/instagram/, "Instagram"], [/facebook|fb\.com/, "Facebook"], [/tiktok/, "TikTok"],
    [/youtube/, "YouTube"], [/reddit/, "Reddit"], [/linkedin/, "LinkedIn"], [/t\.me|telegram/, "Telegram"], [/whatsapp|wa\.me/, "WhatsApp"],
    [/chatgpt|openai|perplexity|claude\.ai|gemini/, "Un asistente de IA"]];
  for (const [re, name] of map) if (re.test(h)) return name;
  return h;
}

const bandera = (cc) => (/^[A-Z]{2}$/.test(cc || "") ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) + " " + cc : "🌍");
const n = (x) => x.toLocaleString("es-ES");

async function telegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
  });
  return r.ok;
}

export async function onRequestPost({ request, env, waitUntil }) {
  const ok = () => new Response(null, { status: 204 });
  const ua = request.headers.get("user-agent") || "";
  if (!ua || BOTS.test(ua)) return ok();
  let body = {};
  try { body = JSON.parse(await request.text()); } catch { return ok(); }
  const host = new URL(request.url).hostname;
  const pagina = String(body.p || "/").slice(0, 120);
  const desde = origen(String(body.r || "").slice(0, 300), host);
  if (desde === null) return ok();

  const hoy = dayKey();
  let c = { dia: hoy, hoy: 0, total: 0 }, resumenAyer = null;
  if (env.VISITAS) {
    try {
      const prev = (await env.VISITAS.get("contador", "json")) || c;
      if (prev.dia !== hoy) { if (prev.hoy) resumenAyer = prev; c = { dia: hoy, hoy: 0, total: prev.total || 0 }; } else c = prev;
      c.hoy++; c.total++;
      await env.VISITAS.put("contador", JSON.stringify(c));
    } catch { /* si el almacén falla, se avisa igual sin número */ }
  }

  const avisar = !env.VISITAS || c.hoy <= AVISO_CADA_UNA_HASTA || c.hoy % 10 === 0;
  const tareas = [];
  if (resumenAyer) tareas.push(telegram(env, `📊 Resumen del ${resumenAyer.dia}: ${n(resumenAyer.hoy)} visitas (${n(resumenAyer.total)} en total desde el inicio).`));
  if (avisar) {
    const movil = /Mobi|Android|iPhone/i.test(ua) ? "📱 Móvil" : "💻 Ordenador";
    const cabecera = env.VISITAS ? `👀 Visita nº ${n(c.hoy)} de hoy · ${n(c.total)} en total` : "👀 Nueva visita";
    const extra = c.hoy > AVISO_CADA_UNA_HASTA ? `\n(Hoy hay mucho tráfico: aviso cada 10 visitas)` : "";
    tareas.push(telegram(env, `${cabecera}\n📄 ${pagina}\n🔎 Llega desde: ${desde}\n${movil} · ${bandera(request.cf?.country)}${extra}`));
  }
  const p = Promise.allSettled(tareas);
  if (waitUntil) waitUntil(p); else await p;
  return ok();
}

// Diagnóstico: abre /api/visita en el navegador. Dice qué está configurado y manda un mensaje de prueba
// (como máximo uno por minuto). No muestra ninguna clave.
export async function onRequestGet({ env }) {
  const estado = { claveDelBot: Boolean(env.TELEGRAM_BOT_TOKEN), idDelChat: Boolean(env.TELEGRAM_CHAT_ID), contador: Boolean(env.VISITAS) };
  let prueba = "no enviada";
  if (estado.claveDelBot && estado.idDelChat) {
    let reciente = false;
    try { if (env.VISITAS) { reciente = Boolean(await env.VISITAS.get("ultima-prueba")); await env.VISITAS.put("ultima-prueba", "1", { expirationTtl: 60 }); } } catch {}
    if (reciente) prueba = "espera un minuto para otra prueba";
    else {
      try {
        const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: "✅ Prueba de PlazaFija: los avisos de visitas funcionan." }) });
        const d = await r.json();
        prueba = d.ok ? "enviada: mira Telegram" : `Telegram respondió: ${d.description}`;
      } catch (e) { prueba = "error al conectar con Telegram"; }
    }
  }
  let visitas = null;
  try { visitas = env.VISITAS ? await env.VISITAS.get("contador", "json") : null; } catch {}
  return new Response(JSON.stringify({ ...estado, prueba, visitas }, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
