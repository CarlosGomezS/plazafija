// Calculadoras para opositores: cada una es una página propia para Google (/herramientas/<slug>/).
// html = formulario y resultado; js = lógica (se inserta en la página).

export const TOOLS = [
{
  slug: "calculadora-nota-oposicion",
  name: "Calculadora de nota de oposición",
  title: "Calculadora de nota de oposición con penalización por errores",
  desc: "Calcula tu nota de un examen tipo test con penalización: aciertos, fallos y preguntas en blanco. Fórmula de −1/3, −1/4 o sin penalizar.",
  intro: "Introduce tus aciertos y fallos y elige la penalización de tu convocatoria. La mayoría de exámenes de la AGE restan un tercio del valor de un acierto por cada error.",
  html: `
  <form class="qa tool" id="f" novalidate>
    <label class="field" for="n">Número de preguntas del examen<input id="n" type="number" min="1" value="60" inputmode="numeric"></label>
    <label class="field" for="ok">Aciertos<input id="ok" type="number" min="0" value="45" inputmode="numeric"></label>
    <label class="field" for="ko">Fallos<input id="ko" type="number" min="0" value="9" inputmode="numeric"></label>
    <label class="field" for="pen">Penalización por error
      <select id="pen"><option value="3">Un fallo resta 1/3 de acierto</option><option value="4">Un fallo resta 1/4 de acierto</option><option value="2">Un fallo resta 1/2 de acierto</option><option value="0">Sin penalización</option></select></label>
    <label class="field" for="max">Nota máxima<select id="max"><option value="10">Sobre 10</option><option value="20">Sobre 20</option><option value="100">Sobre 100</option></select></label>
  </form>
  <div class="result" id="out"></div>
  <p class="err" id="err"></p>`,
  js: `
  const $=id=>document.getElementById(id);
  function calc(){
    const n=+$("n").value, ok=+$("ok").value, ko=+$("ko").value, pen=+$("pen").value, max=+$("max").value;
    $("err").textContent="";
    if(!(n>0)||ok<0||ko<0){ $("out").innerHTML=""; return; }
    if(ok+ko>n){ $("err").textContent="Aciertos más fallos no pueden superar el número de preguntas."; $("out").innerHTML=""; return; }
    const neto=Math.max(0, ok-(pen?ko/pen:0)), nota=neto/n*max, blanco=n-ok-ko;
    const f=x=>x.toLocaleString("es-ES",{maximumFractionDigits:2});
    $("out").innerHTML='<div class="stat main"><b>'+f(nota)+'</b><span>nota sobre '+max+'</span></div>'+
      '<div class="stat"><b>'+f(neto)+'</b><span>aciertos netos</span></div><div class="stat"><b>'+blanco+'</b><span>en blanco</span></div>'+
      '<div class="stat"><b>'+(pen?f(ko/pen):0)+'</b><span>puntos perdidos por fallos</span></div>';
  }
  document.querySelectorAll("#f input,#f select").forEach(e=>e.addEventListener("input",calc)); calc();`,
  faq: [
    ["¿Cómo se calcula la nota con penalización de 1/3?", "Se restan a los aciertos los fallos divididos entre tres y el resultado se pasa a la escala del examen: nota = (aciertos − fallos/3) / preguntas × 10."],
    ["¿Las preguntas en blanco restan?", "No. En los exámenes tipo test con penalización, las preguntas en blanco no suman ni restan."],
    ["¿Me conviene arriesgar en una pregunta dudosa?", "Con 4 opciones y penalización de 1/3, contestar al azar no cambia tu nota esperada. Si puedes descartar al menos una opción, responder te favorece de media."]
  ]
},
{
  slug: "calculadora-plazos-administrativos",
  name: "Calculadora de plazos administrativos",
  title: "Calculadora de plazos administrativos en días hábiles (Ley 39/2015)",
  desc: "Calcula cuándo vence un plazo administrativo en días hábiles o en meses según la Ley 39/2015, descontando sábados, domingos y festivos nacionales.",
  intro: "Indica la fecha de notificación o publicación y el plazo. Los plazos en días se cuentan en hábiles desde el día siguiente, sin sábados, domingos ni festivos (art. 30 Ley 39/2015).",
  html: `
  <form class="qa tool" id="f" novalidate>
    <label class="field" for="d0">Fecha de notificación o publicación<input id="d0" type="date"></label>
    <label class="field" for="num">Plazo<input id="num" type="number" min="1" value="10" inputmode="numeric"></label>
    <label class="field" for="unit">Unidad<select id="unit"><option value="d">Días hábiles</option><option value="m">Meses</option></select></label>
  </form>
  <div class="result" id="out"></div>
  <p class="hint">Solo se descuentan los festivos nacionales. Si en tu comunidad autónoma o municipio hay festivos propios, también son inhábiles: compruébalo en el calendario oficial de tu Administración.</p>`,
  js: `
  const $=id=>document.getElementById(id);
  // Festivos nacionales comunes a toda España (sin festivos autonómicos ni locales)
  const FEST=new Set(["2026-01-01","2026-01-06","2026-04-03","2026-05-01","2026-08-15","2026-10-12","2026-12-08","2026-12-25",
    "2027-01-01","2027-01-06","2027-03-26","2027-10-12","2027-11-01","2027-12-06","2027-12-08"]);
  const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const habil=d=>d.getDay()!==0&&d.getDay()!==6&&!FEST.has(iso(d));
  const fmt=d=>d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  function calc(){
    const v=$("d0").value, n=+$("num").value; if(!v||!(n>0)){ $("out").innerHTML=""; return; }
    const [y,m,dd]=v.split("-").map(Number); let d=new Date(y,m-1,dd), note="";
    if($("unit").value==="d"){ let c=0; while(c<n){ d.setDate(d.getDate()+1); if(habil(d)) c++; } }
    else {
      const t=new Date(y,m-1+n,1), last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
      d=new Date(t.getFullYear(),t.getMonth(),Math.min(dd,last)); if(dd>last) note="El mes de vencimiento no tiene ese día, así que vence el último día del mes. ";
      if(!habil(d)){ while(!habil(d)) d.setDate(d.getDate()+1); note+="El último día era inhábil y se prorroga al primer día hábil siguiente."; }
    }
    $("out").innerHTML='<div class="stat main"><b style="font-size:1.6rem">'+fmt(d)+'</b><span>último día del plazo</span></div>'+(note?'<p class="hint" style="grid-column:1/-1">'+note+'</p>':"");
  }
  const t=new Date(); $("d0").value=iso(t);
  document.querySelectorAll("#f input,#f select").forEach(e=>e.addEventListener("input",calc)); calc();`,
  faq: [
    ["¿Desde cuándo se cuenta un plazo administrativo?", "Desde el día siguiente a la notificación o publicación del acto (art. 30.3 Ley 39/2015)."],
    ["¿Los sábados son hábiles?", "No. Desde la Ley 39/2015 los sábados son inhábiles, igual que los domingos y los festivos."],
    ["¿Qué pasa si el plazo se fija en meses?", "Se cuenta desde el día siguiente y termina el mismo día del mes de vencimiento. Si ese día no existe, vence el último día del mes, y si es inhábil se prorroga al primer día hábil siguiente (art. 30.4 y 30.5)."]
  ]
},
{
  slug: "planificador-estudio-oposiciones",
  name: "Planificador de estudio",
  title: "Planificador de estudio para oposiciones: temas por semana hasta el examen",
  desc: "Calcula cuántos días faltan para tu examen de oposición y cuántos temas debes estudiar por semana, dejando tiempo para repasar.",
  intro: "Pon la fecha del examen, el número de temas y cuántas semanas quieres reservar para repasar al final. Te decimos el ritmo que necesitas.",
  html: `
  <form class="qa tool" id="f" novalidate>
    <label class="field" for="ex">Fecha del examen<input id="ex" type="date"></label>
    <label class="field" for="temas">Número de temas<input id="temas" type="number" min="1" value="28" inputmode="numeric"></label>
    <label class="field" for="hechos">Temas que ya dominas<input id="hechos" type="number" min="0" value="0" inputmode="numeric"></label>
    <label class="field" for="rep">Semanas de repaso al final<input id="rep" type="number" min="0" value="4" inputmode="numeric"></label>
    <label class="field" for="dias">Días de estudio por semana<input id="dias" type="number" min="1" max="7" value="5" inputmode="numeric"></label>
  </form>
  <div class="result" id="out"></div>
  <p class="err" id="err"></p>`,
  js: `
  const $=id=>document.getElementById(id);
  function calc(){
    $("err").textContent="";
    const v=$("ex").value; if(!v){ $("out").innerHTML=""; return; }
    const [y,m,d]=v.split("-").map(Number), ex=new Date(y,m-1,d), now=new Date(); now.setHours(0,0,0,0);
    const days=Math.round((ex-now)/86400000), weeks=days/7, rep=+$("rep").value, left=Math.max(0,+$("temas").value-+$("hechos").value), dpw=Math.min(7,Math.max(1,+$("dias").value));
    if(days<=0){ $("err").textContent="La fecha del examen debe ser futura."; $("out").innerHTML=""; return; }
    const study=weeks-rep;
    if(study<=0){ $("err").textContent="No queda tiempo antes del repaso: reduce las semanas de repaso."; $("out").innerHTML=""; return; }
    const perWeek=left/study, perDay=left/(study*dpw);
    const f=x=>x.toLocaleString("es-ES",{maximumFractionDigits:1});
    $("out").innerHTML='<div class="stat main"><b>'+days+'</b><span>días hasta el examen</span></div>'+
      '<div class="stat"><b>'+f(perWeek)+'</b><span>temas por semana</span></div><div class="stat"><b>'+f(perDay)+'</b><span>temas por día de estudio</span></div>'+
      '<div class="stat"><b>'+f(study)+'</b><span>semanas de temario</span></div>';
  }
  const t=new Date(); t.setMonth(t.getMonth()+6); $("ex").value=t.toISOString().slice(0,10);
  document.querySelectorAll("#f input").forEach(e=>e.addEventListener("input",calc)); calc();`,
  faq: [
    ["¿Cuántas semanas de repaso dejar antes del examen?", "Muchos preparadores recomiendan reservar entre 3 y 6 semanas finales solo para repasar y hacer simulacros, según la extensión del temario."],
    ["¿Cuántos temas al día es razonable?", "Depende de la oposición y del tema, pero para temarios de grupo C2 suele bastar con 3-4 horas diarias de estudio constante."]
  ]
}
];
