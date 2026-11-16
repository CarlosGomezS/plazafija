// Preguntas de los exámenes oficiales del INAP incorporadas al banco de práctica, cada una en su bloque.
// Se excluyen las anuladas, las que dependen de una tabla, las desactualizadas y las de respuesta oficial dudosa.
import { readFileSync } from "node:fs";

const EXCLUIR = new Set([
  "2025:2.2", "2025:2.29", "2025:2.30", // respuesta oficial discutible
  "2025:1R.4",                          // repetida (igual que la 1.36)
  "2023:2.13", "2023:2.15"              // desactualizada o discutible
]);

export const BLOCKS_OFICIALES = {
  PSV: { name: "Psicotécnicos de examen", slug: "psicotecnicos-examen-oficial", meta: "Sinónimos, antónimos, series y problemas de exámenes oficiales del INAP" }
};

const R = (re, s) => re.test(s);
function bloque(t) {
  if (R(/sin[oó]nimo|ant[oó]nimo|palabra|serie|secuencia|ecuaci[oó]n|el valor de x|porcentaje|probabilidad|operadores|equivalencias|orden alfab[eé]tico|pasillos|salas|mineral|beneficios|turistas|almac[eé]n|trabajadores|letras|sortean|bolas|empleados de una oficina|libros de historia|población española|combinaci[oó]n de n[uú]meros|^Hall[ae] /i, t)) return "PSV";
  if (R(/Word/, t)) return "WORD";
  if (R(/Excel/, t)) return "EXCEL";
  if (R(/Access/, t)) return "ACC";
  if (R(/Outlook|correo electr[oó]nico/, t)) return "OUT";
  if (R(/Estatuto B[aá]sico|5\/2015|interin|30\/1984|364\/1995|462\/2002|Registro Central de Personal|Seguridad Social|TDF\/379|Subgrupo C2|funcionari/i, t)) return "TREBEP";
  if (R(/Ley 50\/1997|Gobierno en funciones|Comisiones Delegadas|Plan Anual Normativo|Vicepresidente|estado de sitio/i, t)) return "GOB";
  if (R(/19\/2013|transparencia/i, t)) return "TRA";
  if (R(/Gobierno Abierto|Agenda 2030|ODS|Desarrollo Sostenible/i, t)) return "GA";
  if (R(/Uni[oó]n Europea|Tratado de la Uni[oó]n/i, t)) return "UE";
  if (R(/Protecci[oó]n de Datos|3\/2018|2016\/679/i, t)) return "LPD";
  if (R(/47\/2003|Presupuestari/i, t)) return "PRE";
  if (R(/3\/2007|igualdad efectiva|4\/2023|39\/2006|dependencia/i, t)) return "IGU";
  if (R(/366\/2007/, t)) return "ATE";
  if (R(/208\/1996|951\/2005|quejas/i, t)) return "INFO";
  if (R(/1708\/2011|PCM\/1382|Registro Electr[oó]nico General|Cooperaci[oó]n Archiv[ií]stica/i, t)) return "REG";
  if (R(/203\/202[13]|Punto de Acceso|HAP\/1949|sede electr[oó]nica|portal de internet|certificado|datos de verificaci[oó]n de firma|Cat[aá]logo de Servicios|Administraci[oó]n digital/i, t)) return "AE";
  if (R(/[oó]rganos superiores de la Administraci[oó]n General del Estado|Ley 40\/2015/i, t)) return R(/exterior|Delegaci|Subdelegad|Ministerio|[oó]rganos superiores|alto cargo|organizaci[oó]n de la Administraci[oó]n General/i, t) ? "AGE" : "L40";
  if (R(/Ley 40\/2015/, t)) return R(/exterior|Delegaci|Subdelegad|Ministerio|[oó]rganos superiores|alto cargo|organizaci[oó]n de la Administraci[oó]n General/i, t) ? "AGE" : "L40";
  if (R(/Ley 39\/2015|29\/1998|ejecuci[oó]n forzosa/i, t)) return "L39";
  if (R(/Constituci[oó]n|Defensor del Pueblo|Poder Judicial|6\/1985/i, t)) return "CE";
  if (R(/Windows|Explorador de archivos|PowerShell|certmgr|Este equipo/i, t)) return "WIN";
  if (R(/\bIP\b|IPv4|DNS|HTTP|protocolo|navegador|web|Internet|cookies|dominio|hosting|IRC|VPN|FTP|JavaScript|SMTP|IMAP|CMS|W3C|nube|Copilot|Apache|LAN|red inal/i, t)) return "NET";
  return "INF";
}
function referencia(b, t, anio) {
  const fuente = `Examen INAP ${anio}`;
  if (b === "CE") {
    if (/Defensor del Pueblo/i.test(t)) return `Art. 54 CE · ${fuente}`;
    if (/Poder Judicial|6\/1985/i.test(t)) return `Art. 122 CE · ${fuente}`;
    const m = /art[ií]culo (\d+)/i.exec(t);
    if (m) return `Art. ${m[1]} CE · ${fuente}`;
  }
  const m = /art[ií]culo (\d+)/i.exec(t);
  if (m && b === "TREBEP") return `Art. ${m[1]} TREBEP · ${fuente}`;
  return fuente;
}

export function preguntasOficiales() {
  const out = [], vistos = new Set();
  for (const anio of ["2024", "2025", "2023"]) {
    const x = JSON.parse(readFileSync(new URL(`./examenes/aux-${anio}.json`, import.meta.url), "utf8"));
    for (const s of x.secciones) for (const q of s.preguntas) {
      if (q.a === null || q.img || EXCLUIR.has(`${anio}:${s.id}.${q.n}`)) continue;
      if (/tabla|cuadro/i.test(q.q) || /anteriores/i.test(q.o.join(" ")) && /Todas las anteriores/i.test(q.o[q.a])) continue;
      const clave = q.q.toLowerCase().replace(/\W+/g, "");
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const b = bloque(q.q);
      out.push([b, q.q, q.o, q.a, referencia(b, q.q, anio), q.e || "Respuesta según la plantilla definitiva del INAP."]);
    }
  }
  return out;
}
