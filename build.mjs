// Build de PlazaFija: node build.mjs
// Genera dist/ (web pública), functions/_lib/premium-data.js (banco completo, solo servidor) y demo/index.html (demo de un archivo).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { BLOCKS, QUESTIONS } from "./src/questions.js";
import { TOOLS } from "./src/tools.js";

// ===== CONFIGURACIÓN: cambia estos datos antes de publicar =====
const SITE = {
  name: "PlazaFija",
  url: (process.env.SITE_URL || "https://plazafija.pages.dev").replace(/\/$/, ""),
  freePerDay: 15,
  freeRatio: 3, // 1 de cada 3 preguntas es gratuita (y aparece en las páginas públicas para Google)
  prices: { month: "4,99 €", year: "29 €", yearMonthly: "2,42 €" },
  owner: { name: "[TU NOMBRE Y APELLIDOS]", nif: "[TU NIF]", address: "[TU DIRECCIÓN]", email: "[TU EMAIL DE CONTACTO]" }
};

// ===== 1. Validación del banco (falla el build si hay errores) =====
const errors = [], seen = new Set();
QUESTIONS.forEach((q, i) => {
  const [b, text, opts, a, ref, expl] = q;
  const where = `Pregunta ${i} (${b})`;
  if (!BLOCKS[b]) errors.push(`${where}: bloque desconocido`);
  if (!Array.isArray(opts) || opts.length !== 4) errors.push(`${where}: debe tener 4 opciones`);
  else if (new Set(opts).size !== 4) errors.push(`${where}: opciones repetidas`);
  if (!Number.isInteger(a) || a < 0 || a > 3) errors.push(`${where}: respuesta correcta fuera de rango`);
  if (!text || !ref || !expl) errors.push(`${where}: falta enunciado, referencia o explicación`);
  if (seen.has(text)) errors.push(`${where}: enunciado duplicado`);
  seen.add(text);
});
if (errors.length) { console.error("Errores en el banco de preguntas:\n" + errors.join("\n")); process.exit(1); }

// ===== 2. Preparar datos =====
const all = QUESTIONS.map((q, i) => [...q, "q" + i]);
const perBlockIndex = {};
const free = all.filter((q) => { const n = (perBlockIndex[q[0]] = (perBlockIndex[q[0]] || 0) + 1) - 1; return n % SITE.freeRatio === 0; });
const blocks = {};
for (const [k, b] of Object.entries(BLOCKS)) {
  blocks[k] = { ...b, total: all.filter((q) => q[0] === k).length, free: free.filter((q) => q[0] === k).length };
}
const total = all.length;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const css = readFileSync("src/styles.css", "utf8");
const appJs = readFileSync("src/app.js", "utf8");
const psiJs = readFileSync("src/psico.js", "utf8");
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;

function head({ title, description, path, full = true }) {
  const canonical = SITE.url + path;
  return `${full ? `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` : ""}
<title>${esc(title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${esc(description)}">
${full ? `<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:locale" content="es_ES">
<meta name="theme-color" content="#1f4e8c">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1f4e8c"/><text x="16" y="23" font-family="Georgia" font-size="19" font-weight="700" fill="#fff" text-anchor="middle">P</text></svg>')}">` : ""}
${FONTS}
<style>${full ? "body{margin:0}" : ""}${css}</style>${full ? "</head><body>" : ""}`;
}

const header = (isApp) => `<header class="top"><div class="wrap">
  ${isApp ? `<button class="brand" id="home-btn" type="button"><b>${SITE.name}</b><span>Tests de oposiciones</span></button>
  <button class="pill" id="plan-pill" type="button">Hazte Premium</button>` :
  `<a class="brand" href="/" style="text-decoration:none"><b>${SITE.name}</b><span>Tests de oposiciones</span></a>
  <a class="pill" href="/" style="text-decoration:none">Hacer un test</a>`}
</div></header>`;

const footer = (withLinks) => `<footer><div class="wrap">
  Preguntas basadas en la legislación vigente con referencia al artículo. Comprueba siempre el texto consolidado en el BOE.
  ${withLinks ? `<nav><a href="/legal/aviso-legal/">Aviso legal</a><a href="/legal/privacidad/">Privacidad</a><a href="/legal/condiciones/">Condiciones de contratación</a><span>Contacto: ${esc(SITE.owner.email)}</span></nav>` : "<nav><span>Versión de demostración</span></nav>"}
</div></footer>`;

const lawBlocks = Object.entries(blocks).filter(([, b]) => !b.generated);

function appPage(demo) {
  const BUILD = { demo, blocks, total, freePerDay: SITE.freePerDay, prices: SITE.prices, free: demo ? all : free };
  const seo = `<section class="wrap seo" aria-labelledby="seo-title">
    <h2 id="seo-title">Tests de oposiciones por ley</h2>
    <p>Practica gratis con preguntas tipo test de las normas que entran en Auxiliar Administrativo del Estado, Administrativo, Correos, Justicia y la mayoría de oposiciones de la Administración: Constitución Española, Ley 39/2015, Ley 40/2015 y TREBEP. Cada pregunta incluye la solución explicada y el artículo exacto.</p>
    ${demo ? "" : `<ul>${Object.values(blocks).map((b) => `<li><a href="/tests/${b.slug}/">Test de ${esc(b.name)}</a></li>`).join("")}</ul>
    <h2>Herramientas para opositores</h2><ul>${TOOLS.map((t) => `<li><a href="/herramientas/${t.slug}/">${esc(t.name)}</a></li>`).join("")}</ul>`}
  </section>`;
  return `${head({ title: `${SITE.name}: tests de oposiciones con solución explicada`, description: `Tests de oposiciones gratis con ${total} preguntas explicadas: Constitución, Ley 39/2015, Ley 40/2015, TREBEP y psicotécnicos. Simulacros con penalización real.`, path: "/", full: !demo })}
${header(true)}
<main class="wrap" id="view"></main>
${seo}
${footer(!demo)}
<div class="overlay" id="overlay" hidden><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
<script>
const BUILD = ${JSON.stringify(BUILD)};
${psiJs}
${appJs}
</script>${demo ? "" : "</body></html>"}`;
}

function testPage(key, b) {
  const qs = free.filter((q) => q[0] === key);
  const L = ["A", "B", "C", "D"];
  const isPsi = b.generated;
  const title = isPsi ? `Test de psicotécnicos para oposiciones: series y cálculo` : `Test de la ${b.name} para oposiciones (${b.total} preguntas con solución)`;
  const desc = isPsi ? "Psicotécnicos ilimitados para oposiciones: series numéricas, porcentajes y reglas de tres con la solución explicada." : `Preguntas tipo test de la ${b.name} (${b.meta}) con la respuesta correcta y el artículo que la justifica. Gratis para preparar tu oposición.`;
  const body = isPsi ? `<p>Los psicotécnicos de PlazaFija se generan automáticamente: cada test es distinto. Practica series numéricas (aritméticas, geométricas, alternas y de diferencias crecientes), porcentajes, descuentos y reglas de tres directas e inversas, con la solución explicada paso a paso.</p>` :
    qs.map((q, i) => `<article class="qa"><b>${i + 1}. ${esc(q[1])}</b><ol type="A">${q[2].map((o) => `<li>${esc(o)}</li>`).join("")}</ol>
      <details><summary>Ver solución</summary><p><b>${L[q[3]]}) ${esc(q[2][q[3]])}</b>. ${esc(q[5])} <span class="free-tag">${esc(q[4])}</span></p></details></article>`).join("\n");
  return `${head({ title, description: desc, path: `/tests/${b.slug}/` })}
${header(false)}
<main class="wrap doc">
  <span class="eyebrow">${esc(b.meta)}</span>
  <h1>${isPsi ? "Test de psicotécnicos para oposiciones" : `Test de la ${esc(b.name)}`}</h1>
  <p class="lede">${isPsi ? "Series, porcentajes y proporciones con la solución explicada." : `${qs.length} preguntas de muestra con su solución. En la app tienes ${b.total} preguntas de este bloque, estadísticas y repaso de fallos.`}</p>
  <a class="btn primary cta" href="/">Hacer el test interactivo gratis</a>
  ${body}
  <a class="btn primary cta" href="/">Practicar con ${total} preguntas</a>
  <section class="seo"><h2>Otros tests</h2><ul>${Object.values(blocks).filter((x) => x.slug !== b.slug).map((x) => `<li><a href="/tests/${x.slug}/">${esc(x.name)}</a></li>`).join("")}</ul>
  <h2>Herramientas</h2><ul>${TOOLS.map((t) => `<li><a href="/herramientas/${t.slug}/">${esc(t.name)}</a></li>`).join("")}</ul></section>
</main>
${footer(true)}</body></html>`;
}

function toolPage(t) {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: t.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return `${head({ title: t.title, description: t.desc, path: `/herramientas/${t.slug}/` })}
${header(false)}
<main class="wrap doc">
  <span class="eyebrow">Herramientas para opositores</span>
  <h1>${esc(t.name)}</h1>
  <p class="lede">${esc(t.intro)}</p>
  ${t.html}
  <a class="btn primary cta" href="/">Practica con ${total} preguntas de examen</a>
  <section class="doc" style="padding:0;gap:10px"><h2>Preguntas frecuentes</h2>${t.faq.map(([q, a]) => `<div class="qa"><b>${esc(q)}</b><p style="margin:6px 0 0">${esc(a)}</p></div>`).join("")}</section>
  <section class="seo"><h2>Otras herramientas</h2><ul>${TOOLS.filter((x) => x.slug !== t.slug).map((x) => `<li><a href="/herramientas/${x.slug}/">${esc(x.name)}</a></li>`).join("")}</ul>
  <h2>Tests por ley</h2><ul>${Object.values(blocks).map((b) => `<li><a href="/tests/${b.slug}/">${esc(b.name)}</a></li>`).join("")}</ul></section>
</main>
${footer(true)}
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<script>${t.js}</script></body></html>`;
}

const O = SITE.owner;
const legal = {
  "aviso-legal": ["Aviso legal", `
    <p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa de los datos del titular de este sitio web:</p>
    <ul><li>Titular: ${O.name}</li><li>NIF: ${O.nif}</li><li>Domicilio: ${O.address}</li><li>Email de contacto: ${O.email}</li></ul>
    <h2>Contenido</h2><p>Las preguntas y explicaciones tienen finalidad formativa y se basan en la legislación vigente. No sustituyen a la consulta del texto consolidado en el Boletín Oficial del Estado. El titular no se responsabiliza de los cambios normativos posteriores a la última revisión del contenido.</p>
    <h2>Propiedad intelectual</h2><p>El diseño, el código y la redacción de las preguntas pertenecen al titular. Los textos legales citados son de dominio público.</p>`],
  "privacidad": ["Política de privacidad", `
    <h2>Responsable</h2><p>${O.name}, NIF ${O.nif}, ${O.email}.</p>
    <h2>Qué datos tratamos</h2><p>Para usar los tests no necesitas registrarte. Tu progreso (aciertos, fallos y preguntas usadas) se guarda solo en tu navegador. Si te suscribes, el pago lo gestiona Stripe Payments Europe, Ltd., que trata tu nombre, email y datos de pago. Nosotros solo recibimos tu email y el estado de tu suscripción.</p>
    <h2>Finalidad y base legal</h2><p>Gestionar tu suscripción y darte acceso al contenido Premium (ejecución del contrato) y cumplir obligaciones fiscales (obligación legal).</p>
    <h2>Conservación</h2><p>Mientras la suscripción esté activa y, después, durante los plazos exigidos por la normativa fiscal.</p>
    <h2>Cookies y almacenamiento</h2><p>Solo usamos almacenamiento local técnico, necesario para que la app funcione. No usamos cookies publicitarias ni de análisis de terceros.</p>
    <h2>Tus derechos</h2><p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${O.email}. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>`],
  "condiciones": ["Condiciones de contratación", `
    <h2>Servicio</h2><p>PlazaFija Premium da acceso a todo el banco de preguntas, simulacros y repaso de fallos mientras la suscripción esté activa.</p>
    <h2>Precios</h2><p>Plan mensual: ${SITE.prices.month} al mes. Plan anual: ${SITE.prices.year} al año. Impuestos incluidos.</p>
    <h2>Renovación y cancelación</h2><p>La suscripción se renueva automáticamente al final de cada periodo. Puedes cancelarla en cualquier momento desde «Mi cuenta» → «Gestionar suscripción»; mantendrás el acceso hasta el final del periodo ya pagado.</p>
    <h2>Desistimiento</h2><p>Al tratarse de contenido digital que se facilita de forma inmediata, al suscribirte aceptas expresamente el inicio inmediato del servicio y reconoces que pierdes el derecho de desistimiento (art. 103.m del Real Decreto Legislativo 1/2007). Si tienes cualquier problema, escríbenos a ${O.email}.</p>
    <h2>Contenido</h2><p>Revisamos las preguntas con la legislación vigente, pero pueden contener errores o quedar desactualizadas por cambios normativos. Si detectas un error, escríbenos y lo corregiremos.</p>`]
};
function legalPage(slug, [title, html]) {
  return `${head({ title: `${title} · ${SITE.name}`, description: `${title} de ${SITE.name}.`, path: `/legal/${slug}/` })}
${header(false)}<main class="wrap doc"><h1>${title}</h1>${html}</main>${footer(true)}</body></html>`;
}

// ===== 3. Escribir archivos =====
rmSync("dist", { recursive: true, force: true });
const out = (p, c) => { mkdirSync(p.split("/").slice(0, -1).join("/"), { recursive: true }); writeFileSync(p, c); };
out("dist/index.html", appPage(false));
for (const [k, b] of Object.entries(blocks)) out(`dist/tests/${b.slug}/index.html`, testPage(k, b));
for (const t of TOOLS) out(`dist/herramientas/${t.slug}/index.html`, toolPage(t));
for (const [slug, data] of Object.entries(legal)) out(`dist/legal/${slug}/index.html`, legalPage(slug, data));
const urls = ["/", ...Object.values(blocks).map((b) => `/tests/${b.slug}/`), ...TOOLS.map((t) => `/herramientas/${t.slug}/`), ...Object.keys(legal).map((s) => `/legal/${s}/`)];
const today = new Date().toISOString().slice(0, 10);
out("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
out("dist/robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE.url}/sitemap.xml\n`);
out("dist/_headers", `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n`);
out("functions/_lib/premium-data.js", `// Generado por build.mjs. No editar: edita src/questions.js y vuelve a ejecutar el build.\nexport const PREMIUM = ${JSON.stringify(all)};\n`);
out("demo/index.html", appPage(true));

console.log(`OK · ${total} preguntas (${free.length} gratuitas) en ${lawBlocks.length} leyes + psicotécnicos · ${urls.length} páginas · web: ${SITE.url}`);
