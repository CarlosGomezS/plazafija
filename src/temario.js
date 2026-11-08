// Temario oficial de Auxiliar Administrativo del Estado (ingreso libre).
// Fuente: Resolución de 18 de diciembre de 2025, anexo I (BOE-A-2025-26262, BOE de 22/12/2025).
// Los títulos están resumidos; el enunciado oficial completo está en el BOE.
// Cada tema reúne automáticamente las preguntas del banco que le corresponden (ver temaOf).

export const CONVOCATORIA = {
  boe: "BOE-A-2025-26262",
  fecha: "22 de diciembre de 2025",
  examen: "Ejercicio único de 90 minutos con dos partes: hasta 60 preguntas (30 del bloque I y 30 psicotécnicas) y hasta 50 preguntas del bloque II. Cada error resta un tercio de un acierto y las preguntas en blanco no penalizan. Cada parte se puntúa de 0 a 50 y hay que sacar al menos 25 en cada una. Las preguntas de ofimática se refieren a Windows 11 y Microsoft 365."
};

export const TEMAS = [
  // ── Bloque I · Organización pública ──
  { n: 1,  b: "I",  slug: "tema-1-constitucion-espanola", t: "La Constitución Española de 1978", d: "Estructura, características y principios; derechos y deberes fundamentales, su garantía y suspensión." },
  { n: 2,  b: "I",  slug: "tema-2-tribunal-constitucional-reforma-corona", t: "Tribunal Constitucional, reforma de la Constitución y la Corona", d: "Composición y funciones del Tribunal Constitucional, procedimientos de reforma constitucional y la Corona." },
  { n: 3,  b: "I",  slug: "tema-3-cortes-generales-defensor-pueblo", t: "Las Cortes Generales y el Defensor del Pueblo", d: "Congreso y Senado: composición, atribuciones y elaboración de las leyes; el Defensor del Pueblo." },
  { n: 4,  b: "I",  slug: "tema-4-poder-judicial", t: "El Poder Judicial", d: "El Consejo General del Poder Judicial, el Tribunal Supremo y la organización judicial española." },
  { n: 5,  b: "I",  slug: "tema-5-gobierno-y-administracion", t: "El Gobierno y la Administración", d: "El Presidente del Gobierno, el Consejo de Ministros, las relaciones entre el Gobierno y las Cortes y la Ley 50/1997 del Gobierno." },
  { n: 6,  b: "I",  slug: "tema-6-gobierno-abierto-agenda-2030", t: "Gobierno Abierto y Agenda 2030", d: "Concepto y principios del Gobierno Abierto y los Objetivos de Desarrollo Sostenible." },
  { n: 7,  b: "I",  slug: "tema-7-ley-transparencia", t: "La Ley 19/2013 de Transparencia", d: "Publicidad activa, derecho de acceso a la información pública y buen gobierno." },
  { n: 8,  b: "I",  slug: "tema-8-administracion-general-del-estado", t: "La Administración General del Estado", d: "Órganos centrales, órganos territoriales y Administración General del Estado en el exterior." },
  { n: 9,  b: "I",  slug: "tema-9-organizacion-territorial", t: "La organización territorial del Estado", d: "Las comunidades autónomas, sus estatutos y la Administración local." },
  { n: 10, b: "I",  slug: "tema-10-union-europea", t: "La Unión Europea", d: "Instituciones y organización de la Unión Europea." },
  { n: 11, b: "I",  slug: "tema-11-procedimiento-administrativo", t: "Procedimiento administrativo y régimen jurídico", d: "Ley 39/2015 del Procedimiento Administrativo Común, Ley 40/2015 de Régimen Jurídico del Sector Público y recurso contencioso-administrativo." },
  { n: 12, b: "I",  slug: "tema-12-proteccion-de-datos", t: "Protección de datos personales", d: "Reglamento General de Protección de Datos y Ley Orgánica 3/2018 (LOPDGDD)." },
  { n: 13, b: "I",  slug: "tema-13-personal-funcionario", t: "El personal funcionario", d: "Régimen jurídico, clases de personal, oferta de empleo público, selección y situaciones administrativas (TREBEP)." },
  { n: 14, b: "I",  slug: "tema-14-derechos-deberes-funcionarios", t: "Derechos y deberes de los funcionarios", d: "Derechos, deberes y código de conducta, carrera, promoción interna, retribuciones, régimen disciplinario y Seguridad Social." },
  { n: 15, b: "I",  slug: "tema-15-presupuesto-del-estado", t: "El Presupuesto del Estado", d: "Concepto, características y ciclo presupuestario." },
  { n: 16, b: "I",  slug: "tema-16-politicas-de-igualdad", t: "Políticas de igualdad", d: "Igualdad de mujeres y hombres (LO 3/2007), violencia de género, igualdad LGTBI, discapacidad y dependencia." },
  // ── Bloque II · Actividad administrativa y ofimática ──
  { n: 1,  b: "II", slug: "bloque-2-tema-1-atencion-al-publico", t: "Atención al público", d: "Acogida e información a la ciudadanía y atención a personas con discapacidad." },
  { n: 2,  b: "II", slug: "bloque-2-tema-2-informacion-administrativa", t: "Servicios de información administrativa", d: "Información general y particular, quejas, reclamaciones y peticiones." },
  { n: 3,  b: "II", slug: "bloque-2-tema-3-registro-y-archivo", t: "Documento, registro y archivo", d: "El documento administrativo, el registro y el archivo." },
  { n: 4,  b: "II", slug: "bloque-2-tema-4-administracion-electronica", t: "Administración electrónica", d: "Servicios electrónicos, páginas web públicas y Punto de Acceso General." },
  { n: 5,  b: "II", slug: "bloque-2-tema-5-informatica-basica", t: "Informática básica", d: "Hardware, software, almacenamiento de datos, sistemas operativos y seguridad." },
  { n: 6,  b: "II", slug: "bloque-2-tema-6-windows-11", t: "Windows 11", d: "Escritorio, menú Inicio, configuración y Copilot." },
  { n: 7,  b: "II", slug: "bloque-2-tema-7-explorador-de-windows", t: "El Explorador de Windows", d: "Archivos, carpetas, búsqueda y herramientas del sistema." },
  { n: 8,  b: "II", slug: "bloque-2-tema-8-word", t: "Word (Microsoft 365)", d: "Procesador de textos: formato, tablas, estilos, combinación de correspondencia." },
  { n: 9,  b: "II", slug: "bloque-2-tema-9-excel", t: "Excel (Microsoft 365)", d: "Hoja de cálculo: fórmulas, funciones, gráficos y tablas." },
  { n: 10, b: "II", slug: "bloque-2-tema-10-access", t: "Access (Microsoft 365)", d: "Bases de datos: tablas, consultas, formularios e informes." },
  { n: 11, b: "II", slug: "bloque-2-tema-11-outlook", t: "Outlook (Microsoft 365)", d: "Correo electrónico, calendario, contactos y tareas." },
  { n: 12, b: "II", slug: "bloque-2-tema-12-internet", t: "Internet", d: "Conceptos básicos, protocolos, servicios y navegadores." }
];

// Asigna cada pregunta a un tema a partir de su bloque y del artículo citado.
const art = (ref) => { const m = /Art\.\s*(\d+)/.exec(ref); return m ? +m[1] : null; };
const T = (b, n) => TEMAS.find((x) => x.b === b && x.n === n);

export function temaOf(q) {
  const [block, , , , ref] = q;
  const a = art(ref);
  switch (block) {
    case "CE":
      if (/Título II\b/.test(ref) || /Título IX/.test(ref)) return T("I", 2);
      if (/Título VIII/.test(ref)) return T("I", 9);
      if (a == null) return T("I", 1);
      if (a === 54 || (a >= 66 && a <= 96)) return T("I", 3);
      if (a >= 56 && a <= 65) return T("I", 2);
      if (a >= 159) return T("I", 2);
      if (a >= 97 && a <= 116) return T("I", 5);
      if (a >= 117 && a <= 127) return T("I", 4);
      if (a >= 128 && a <= 136) return T("I", 15);
      if (a >= 137 && a <= 158) return T("I", 9);
      return T("I", 1);
    case "GOB": return T("I", 5);
    case "TRA": return T("I", 7);
    case "L39": case "L40": return T("I", 11);
    case "LPD": return T("I", 12);
    case "TREBEP": return a != null && ((a >= 14 && a <= 54) || (a >= 93 && a <= 98)) ? T("I", 14) : T("I", 13);
    case "IGU": return T("I", 16);
    default: return null;
  }
}
