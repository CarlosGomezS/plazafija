// PlazaFija · lógica de la app. BUILD y PSI los inyecta el script de build.
const BLOCKS = BUILD.blocks;
const toObj = (r) => ({ b: r[0], q: r[1], o: r[2], a: r[3], r: r[4], e: r[5], id: r[6] });
const FREE = BUILD.free.map(toObj);
let ALL = BUILD.demo ? FREE : null;

// ===== Estado guardado en el navegador =====
const KEY = "plazafija-v2";
let S = { date: "", used: 0, demoPremium: false, token: "", code: "", email: "", stats: {}, fails: [] };
function load() { try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {} }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function today() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function premium() { return BUILD.demo ? S.demoPremium : Boolean(ALL && S.token); }
function remaining() { if (S.date !== today()) { S.date = today(); S.used = 0; save(); } return premium() ? Infinity : Math.max(0, BUILD.freePerDay - S.used); }
function bank() { return premium() && ALL ? ALL : FREE; }

const $ = (s) => document.querySelector(s);
const view = $("#view");
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const letters = ["A", "B", "C", "D"];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let T = null, timer = null;

function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}
async function api(path, data) {
  const res = await fetch("/api/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data || {}) });
  let out = {}; try { out = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error(out.error || "Error de conexión"); err.status = res.status; err.demo = out.demo; throw err; }
  return out;
}
function pill() { const p = $("#plan-pill"); p.textContent = premium() ? "Mi cuenta" : "Hazte Premium"; p.classList.toggle("pro", premium()); }

// ===== Inicio =====
function home() {
  clearInterval(timer); T = null; pill();
  const rem = remaining(), used = premium() ? 0 : BUILD.freePerDay - rem, fails = S.fails.length;
  const pro = premium();
  view.innerHTML = `
  <section>
    <span class="eyebrow">Auxiliar Administrativo y leyes comunes a decenas de oposiciones</span>
    <h1>Practica el temario con preguntas explicadas artículo por artículo</h1>
    <p class="lede">${BUILD.total} preguntas de la Constitución, la Ley 39/2015, la Ley 40/2015, el TREBEP y más, y psicotécnicos ilimitados. Cada respuesta te dice en qué artículo está.</p>
  </section>
  <div class="quota">
    ${pro ? `<div class="quota-row"><b>Premium activo</b><span>Todo el banco de preguntas, sin límites</span></div>` :
    `<div class="quota-row"><b>Te quedan ${rem} de ${BUILD.freePerDay} preguntas gratis hoy</b><span class="hint">Se renuevan cada día</span></div>
     <div class="bar"><i style="width:${(used / BUILD.freePerDay) * 100}%"></i></div>`}
  </div>
  <div class="actions">
    <button class="btn primary" id="go-mix" type="button">Test rápido <small>10 preguntas mezcladas</small></button>
    <button class="btn" id="go-sim" type="button"><span>Simulacro de examen<br><small>25 preguntas · 25 min · −1/3 por error</small></span>${pro ? "" : '<span class="lock">Premium</span>'}</button>
    <button class="btn" id="go-fails" type="button" ${fails ? "" : "disabled"}>Repasar mis fallos <small>${fails} pendiente${fails === 1 ? "" : "s"}</small></button>
    <button class="btn" id="go-psi" type="button">Psicotécnicos <small>Series y cálculo</small></button>
  </div>
  <section style="display:flex;flex-direction:column;gap:10px">
    <h2>Por bloques</h2>
    <div class="blocks">
      ${Object.entries(BLOCKS).map(([k, b]) => {
        const st = S.stats[k] || { ok: 0, ko: 0 }, tot = st.ok + st.ko;
        const avail = b.generated ? "ilimitadas" : pro ? `${b.total} preguntas` : `${b.free} gratis de ${b.total}`;
        return `<button class="block" type="button" data-block="${k}">
          <h3>${esc(b.name)}</h3><span class="meta">${esc(b.meta)} · ${avail}</span>
          <span class="score"><b>${tot ? Math.round(st.ok / tot * 100) + "%" : "—"}</b><span>${tot ? tot + " respondidas" : "sin empezar"}</span></span>
        </button>`;
      }).join("")}
    </div>
  </section>`;
  $("#go-mix").onclick = () => start("mix");
  $("#go-sim").onclick = () => start("sim");
  $("#go-fails").onclick = () => start("fails");
  $("#go-psi").onclick = () => start("block", "PSI");
  view.querySelectorAll("[data-block]").forEach((b) => (b.onclick = () => start("block", b.dataset.block)));
  window.scrollTo(0, 0);
}

// ===== Test =====
function start(mode, block) {
  if (mode === "sim" && !premium()) return openPay("El simulacro es una función Premium");
  if (remaining() === 0) return openPay();
  const laws = bank();
  let list;
  if (mode === "block" && block === "PSI") list = PSI(10);
  else if (mode === "block") list = shuffle(laws.filter((q) => q.b === block)).slice(0, 10);
  else if (mode === "fails") list = shuffle(laws.filter((q) => S.fails.includes(q.id))).slice(0, 10);
  else if (mode === "sim") list = shuffle(laws).slice(0, 25);
  else list = shuffle(laws).slice(0, 10);
  if (!list.length) { toast("No hay preguntas disponibles en este bloque."); return home(); }
  T = { mode, block, list, i: 0, picks: [], end: mode === "sim" ? Date.now() + 25 * 60000 : 0 };
  if (T.end) timer = setInterval(tick, 1000);
  question();
}
function tick() {
  if (!T || !T.end) return;
  const el = $("#timer"), left = Math.max(0, T.end - Date.now());
  if (el) el.textContent = String(Math.floor(left / 60000)).padStart(2, "0") + ":" + String(Math.floor(left / 1000) % 60).padStart(2, "0");
  if (left === 0) { clearInterval(timer); results(); }
}
function title() { return T.mode === "block" ? BLOCKS[T.block].name : T.mode === "sim" ? "Simulacro" : T.mode === "fails" ? "Repaso de fallos" : "Test rápido"; }
function question() {
  const q = T.list[T.i], rem = remaining();
  view.innerHTML = `
  <div class="qhead">
    <span class="eyebrow">${esc(title())} · Pregunta <b>${T.i + 1}</b> de ${T.list.length}</span>
    ${T.end ? '<span class="timer" id="timer">25:00</span>' : (premium() ? "" : `<span class="hint">${rem} gratis hoy</span>`)}
  </div>
  <div class="bar"><i style="width:${(T.i / T.list.length) * 100}%"></i></div>
  <article class="qcard">
    <p class="qtext">${esc(q.q)}</p>
    <div class="opts">${q.o.map((o, i) => `<button class="opt" type="button" data-i="${i}" id="opt-${i}"><span class="k">${letters[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>
    <div id="feedback"></div>
  </article>
  <div class="row"><button class="link" id="quit" type="button">Salir del test</button></div>`;
  if (T.end) tick();
  view.querySelectorAll(".opt").forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
  $("#quit").onclick = () => (T.picks.length ? results() : home());
  window.scrollTo(0, 0);
}
function answer(i) {
  const q = T.list[T.i];
  if (!premium()) { if (remaining() === 0) return openPay(); S.used++; }
  const ok = i === q.a;
  T.picks.push({ q, i, ok });
  const st = S.stats[q.b] || (S.stats[q.b] = { ok: 0, ko: 0 }); ok ? st.ok++ : st.ko++;
  if (q.b !== "PSI") { if (ok) S.fails = S.fails.filter((x) => x !== q.id); else if (!S.fails.includes(q.id)) S.fails.push(q.id); }
  save();
  view.querySelectorAll(".opt").forEach((b) => { b.disabled = true; const n = +b.dataset.i; if (n === q.a) b.classList.add("right"); else if (n === i) b.classList.add("wrong"); });
  const last = T.i === T.list.length - 1;
  if (T.end) {
    $("#feedback").innerHTML = `<div class="row"><span class="hint">Respuesta guardada</span><button class="btn primary" id="next" type="button">${last ? "Ver nota" : "Siguiente"}</button></div>`;
  } else {
    $("#feedback").innerHTML = `
      <div class="expl"><span class="ref">${esc(q.r)}</span><span class="verdict ${ok ? "ok" : "ko"}">${ok ? "Correcta." : "Incorrecta."}</span> ${esc(q.e)}</div>
      <div class="row" style="margin-top:12px"><span class="hint">${premium() ? "" : remaining() + " preguntas gratis restantes hoy"}</span><button class="btn primary" id="next" type="button">${last ? "Ver resultado" : "Siguiente"}</button></div>`;
  }
  $("#next").onclick = () => { if (last) return results(); if (!premium() && remaining() === 0) { results(); return openPay(); } T.i++; question(); };
  $("#next").focus();
}

// ===== Resultados =====
function results() {
  clearInterval(timer);
  const n = T.list.length, ok = T.picks.filter((p) => p.ok).length, ko = T.picks.filter((p) => !p.ok).length, blank = n - T.picks.length;
  const nota = Math.max(0, (ok - ko / 3) / n * 10);
  const wrong = T.picks.filter((p) => !p.ok);
  view.innerHTML = `
  <section><span class="eyebrow">${esc(title())} terminado</span><h1>${nota >= 5 ? "Aprobado" : "Sigue practicando"}</h1>
  <p class="lede">Nota calculada como en el examen de la AGE: cada error resta un tercio de acierto y las preguntas en blanco no puntúan.</p></section>
  <div class="result">
    <div class="stat main"><b>${nota.toFixed(2).replace(".", ",")}</b><span>nota sobre 10</span></div>
    <div class="stat"><b>${ok}</b><span>aciertos</span></div>
    <div class="stat"><b>${ko}</b><span>fallos</span></div>
    <div class="stat"><b>${blank}</b><span>en blanco</span></div>
  </div>
  ${!premium() ? `<div class="quota"><div class="quota-row"><b>Con Premium tendrías ${BUILD.total} preguntas y simulacros</b><button class="btn primary" id="res-pro" type="button">Ver planes</button></div></div>` : ""}
  ${wrong.length ? `<section class="review"><h2>Revisa tus fallos</h2>${wrong.map((p) => `
    <div class="item"><p><b>${esc(p.q.q)}</b></p><p>Tu respuesta: ${esc(p.q.o[p.i])}</p><p class="ans">Correcta: ${esc(p.q.o[p.q.a])}</p>
    <div class="expl"><span class="ref">${esc(p.q.r)}</span>${esc(p.q.e)}</div></div>`).join("")}</section>` : ""}
  <div class="actions">
    <button class="btn primary" id="again" type="button">Hacer otro test <small>${T.mode === "block" ? esc(BLOCKS[T.block].name) : "mezclado"}</small></button>
    <button class="btn" id="back" type="button">Volver al inicio</button>
  </div>`;
  const m = T.mode, b = T.block;
  $("#again").onclick = () => start(m === "sim" && !premium() ? "mix" : m, b);
  $("#back").onclick = home;
  if ($("#res-pro")) $("#res-pro").onclick = () => openPay("Elige tu plan");
  window.scrollTo(0, 0);
}

// ===== Hojas modales (pago, cuenta, recuperar acceso) =====
const overlay = $("#overlay"), sheet = $("#sheet");
let plan = "year";
function openSheet(html) { sheet.innerHTML = html; overlay.hidden = false; const f = sheet.querySelector("button, input"); if (f) f.focus(); }
function closeSheet() { overlay.hidden = true; if (!T) home(); }
overlay.onclick = (e) => { if (e.target === overlay) closeSheet(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) closeSheet(); });

function openPay(reason) {
  openSheet(`
    <span class="eyebrow">${esc(reason || "Has usado tus preguntas gratis de hoy")}</span>
    <h2 id="sheet-title">Estudia sin límites con PlazaFija Premium</h2>
    <ul>
      <li>Las ${BUILD.total} preguntas de todos los bloques, sin límite diario</li>
      <li>Simulacros cronometrados con penalización real</li>
      <li>Repaso automático de tus fallos</li>
      <li>Nuevas preguntas y oposiciones según se añadan</li>
    </ul>
    <div class="plans">
      <button class="plan ${plan === "year" ? "sel" : ""}" type="button" data-plan="year"><span class="tag">Ahorra 50 %</span><b>${BUILD.prices.year}</b><span>al año · ${BUILD.prices.yearMonthly}/mes</span></button>
      <button class="plan ${plan === "month" ? "sel" : ""}" type="button" data-plan="month"><b>${BUILD.prices.month}</b><span>al mes · cancela cuando quieras</span></button>
    </div>
    <button class="btn primary" id="pw-buy" type="button">Suscribirme <small>Pago seguro con tarjeta</small></button>
    <p class="err" id="pw-err"></p>
    <div class="demo" id="pw-demo" hidden>Demo: la pasarela de pago aún no está conectada. <button class="link" id="pw-sim" type="button">Simular pago y activar Premium</button></div>
    <div class="row"><button class="link" id="pw-restore" type="button">Ya soy Premium</button><button class="link" id="pw-close" type="button">Seguir gratis</button></div>`);
  sheet.querySelectorAll(".plan").forEach((p) => (p.onclick = () => { plan = p.dataset.plan; sheet.querySelectorAll(".plan").forEach((x) => x.classList.toggle("sel", x === p)); }));
  $("#pw-close").onclick = closeSheet;
  $("#pw-restore").onclick = openRestore;
  $("#pw-sim").onclick = () => { S.demoPremium = true; save(); overlay.hidden = true; toast("Premium activado (demo)"); home(); };
  $("#pw-buy").onclick = async () => {
    if (BUILD.demo) { $("#pw-demo").hidden = false; return; }
    const btn = $("#pw-buy"); btn.disabled = true; $("#pw-err").textContent = "";
    try { const r = await api("checkout", { plan }); location.href = r.url; }
    catch (e) { btn.disabled = false; $("#pw-err").textContent = e.demo ? "Los pagos todavía no están activados en esta web." : e.message; }
  };
}

function openRestore() {
  openSheet(`
    <h2>Recupera tu acceso Premium</h2>
    <p class="hint" style="margin:0">Escribe el email con el que pagaste y el código de acceso que te mostramos al suscribirte.</p>
    <form id="rs-form" class="actions" style="grid-template-columns:1fr" novalidate>
      <label class="field" for="rs-email">Email<input id="rs-email" type="email" autocomplete="email" required></label>
      <label class="field" for="rs-code">Código de acceso<input id="rs-code" placeholder="ABCD-1234" autocomplete="off" required></label>
      <p class="err" id="rs-err"></p>
      <button class="btn primary" type="submit" id="rs-go">Recuperar acceso</button>
    </form>
    <button class="link" id="rs-back" type="button">Volver</button>`);
  $("#rs-back").onclick = () => openPay("Elige tu plan");
  $("#rs-form").onsubmit = async (e) => {
    e.preventDefault();
    if (BUILD.demo) { $("#rs-err").textContent = "En la demo no hay cuentas reales."; return; }
    const go = $("#rs-go"); go.disabled = true; $("#rs-err").textContent = "";
    try { const r = await api("restore", { email: $("#rs-email").value, code: $("#rs-code").value }); await activate(r); overlay.hidden = true; toast("Acceso Premium recuperado"); home(); }
    catch (err) { go.disabled = false; $("#rs-err").textContent = err.message; }
  };
}

function openAccount() {
  openSheet(`
    <span class="eyebrow">Mi cuenta</span>
    <h2>Premium activo</h2>
    ${S.email ? `<p style="margin:0">Suscripción a nombre de <b>${esc(S.email)}</b></p>` : ""}
    ${S.code ? `<div><p class="hint" style="margin:0 0 6px">Tu código para entrar desde otro dispositivo:</p><div class="code">${esc(S.code)}</div></div>` : ""}
    <button class="btn" id="ac-portal" type="button">Gestionar suscripción <small>Tarjeta, facturas o cancelar</small></button>
    <p class="err" id="ac-err"></p>
    <div class="row"><button class="link" id="ac-logout" type="button">Cerrar sesión en este dispositivo</button><button class="link" id="ac-close" type="button">Cerrar</button></div>`);
  $("#ac-close").onclick = closeSheet;
  $("#ac-logout").onclick = () => { S.token = ""; S.demoPremium = false; ALL = BUILD.demo ? FREE : null; save(); overlay.hidden = true; toast("Sesión cerrada"); home(); };
  $("#ac-portal").onclick = async () => {
    if (BUILD.demo) { $("#ac-err").textContent = "En la demo no hay suscripción real."; return; }
    try { const r = await api("portal", { token: S.token }); location.href = r.url; } catch (e) { $("#ac-err").textContent = e.message; }
  };
}

function welcome() {
  openSheet(`
    <span class="eyebrow">Pago completado</span>
    <h2>Bienvenido a PlazaFija Premium</h2>
    <p style="margin:0">Ya tienes acceso a todo. Guarda este código: lo necesitarás junto a tu email para entrar desde otro móvil u ordenador.</p>
    <div class="code">${esc(S.code)}</div>
    <button class="btn primary" id="wc-go" type="button">Empezar a estudiar</button>`);
  $("#wc-go").onclick = closeSheet;
}

// ===== Acceso Premium real (servidor) =====
async function activate(r) {
  S.token = r.token; if (r.code) S.code = r.code; if (r.email) S.email = r.email; save();
  await loadPremium();
}
async function loadPremium() {
  if (BUILD.demo || !S.token) return;
  try {
    const r = await api("questions", { token: S.token });
    S.token = r.token; save();
    ALL = r.questions.map(toObj);
  } catch (e) {
    if (e.status === 401 || e.status === 402) { S.token = ""; save(); toast(e.message); }
  }
}

$("#plan-pill").onclick = () => (premium() ? openAccount() : openPay("Elige tu plan"));
$("#home-btn").onclick = home;

(async function init() {
  load(); remaining(); home();
  if (BUILD.demo) return;
  const params = new URLSearchParams(location.search);
  const sid = params.get("session_id");
  if (sid || params.has("pago")) history.replaceState(null, "", location.pathname);
  if (sid) {
    try { await activate(await api("claim", { session_id: sid })); home(); welcome(); }
    catch (e) { toast(e.message); }
  } else if (S.token) {
    await loadPremium(); home();
  }
})();
