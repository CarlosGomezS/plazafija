// Generador de psicotécnicos: crea preguntas nuevas cada vez (series, porcentajes, proporciones).
// Devuelve objetos con el mismo formato que el banco: {b, q, o, a, r, e, id}
const PSI = (() => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const fmt = n => Number.isInteger(n) ? n.toLocaleString("es-ES") : n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

  function options(correct, spread) {
    const set = new Set([correct]);
    const deltas = [spread, -spread, 2 * spread, -2 * spread, 1, -1, 3 * spread, spread + 1];
    for (const d of deltas) { if (set.size >= 4) break; const v = correct + d; if (v >= 0) set.add(v); }
    let k = 4; while (set.size < 4) set.add(correct + k++);
    const opts = [...set].sort(() => Math.random() - 0.5);
    return { o: opts.map(fmt), a: opts.indexOf(correct) };
  }

  const gens = [
    function aritmetica() {
      const start = rnd(2, 40), d = pick([3, 4, 5, 6, 7, 8, 9, 11, 12, -3, -4, -6]);
      const s = Array.from({ length: 6 }, (_, i) => start + d * i + (d < 0 ? 60 : 0));
      const { o, a } = options(s[5], Math.abs(d));
      return { q: `¿Qué número continúa la serie? ${s.slice(0, 5).map(fmt).join(", ")}, …`, o, a,
        e: `Cada término ${d > 0 ? "suma" : "resta"} ${Math.abs(d)} al anterior: ${fmt(s[4])} ${d > 0 ? "+" : "−"} ${Math.abs(d)} = ${fmt(s[5])}.` };
    },
    function geometrica() {
      const start = rnd(1, 6), r = pick([2, 3]);
      const s = Array.from({ length: 6 }, (_, i) => start * r ** i);
      const { o, a } = options(s[5], s[4]);
      return { q: `¿Qué número continúa la serie? ${s.slice(0, 5).map(fmt).join(", ")}, …`, o, a,
        e: `Cada término se multiplica por ${r}: ${fmt(s[4])} × ${r} = ${fmt(s[5])}.` };
    },
    function crecientes() {
      const start = rnd(1, 20), d0 = rnd(1, 4);
      const s = [start]; for (let i = 1; i < 6; i++) s.push(s[i - 1] + d0 + (i - 1));
      const { o, a } = options(s[5], 2);
      return { q: `¿Qué número continúa la serie? ${s.slice(0, 5).map(fmt).join(", ")}, …`, o, a,
        e: `Las diferencias aumentan de uno en uno (+${d0}, +${d0 + 1}, +${d0 + 2}…). El siguiente salto es +${d0 + 4}: ${fmt(s[4])} + ${d0 + 4} = ${fmt(s[5])}.` };
    },
    function alterna() {
      const a0 = rnd(1, 15), da = pick([2, 3, 5]), b0 = rnd(20, 40), db = pick([-2, -3, 4]);
      const s = []; for (let i = 0; i < 7; i++) s.push(i % 2 === 0 ? a0 + da * (i / 2) : b0 + db * ((i - 1) / 2));
      const { o, a } = options(s[6], da);
      return { q: `¿Qué número continúa la serie? ${s.slice(0, 6).map(fmt).join(", ")}, …`, o, a,
        e: `Son dos series intercaladas. Las posiciones impares van ${da > 0 ? "+" : ""}${da} (${a0}, ${a0 + da}, ${a0 + 2 * da}…), así que toca ${fmt(s[6])}.` };
    },
    function porcentaje() {
      const p = pick([5, 10, 12, 15, 20, 25, 30, 35, 40, 60, 75]), base = pick([40, 60, 80, 120, 140, 160, 200, 240, 300, 360, 480, 600, 800]);
      const res = base * p / 100;
      if (!Number.isInteger(res)) return porcentaje();
      const { o, a } = options(res, Math.max(2, Math.round(res / 5)));
      return { q: `¿Cuánto es el ${p} % de ${fmt(base)}?`, o, a, e: `${fmt(base)} × ${p} / 100 = ${fmt(res)}.` };
    },
    function descuento() {
      const p = pick([10, 15, 20, 25, 30, 40]), price = pick([40, 60, 80, 120, 150, 200, 240, 300]);
      const res = price * (100 - p) / 100;
      if (!Number.isInteger(res)) return descuento();
      const { o, a } = options(res, Math.max(3, Math.round(price * 0.05)));
      return { q: `Un artículo cuesta ${fmt(price)} € y tiene un descuento del ${p} %. ¿Cuánto se paga?`, o: o.map(x => x + " €"), a,
        e: `Se paga el ${100 - p} % del precio: ${fmt(price)} × ${100 - p} / 100 = ${fmt(res)} €.` };
    },
    function directa() {
      const n1 = rnd(2, 6), unit = rnd(2, 9), n2 = n1 + rnd(2, 8);
      const p1 = n1 * unit, res = n2 * unit;
      const item = pick(["cuadernos", "carpetas", "bolígrafos", "sellos", "archivadores"]);
      const { o, a } = options(res, unit);
      return { q: `Si ${n1} ${item} cuestan ${fmt(p1)} €, ¿cuánto cuestan ${n2}?`, o: o.map(x => x + " €"), a,
        e: `Regla de tres directa: cada unidad cuesta ${fmt(p1)} / ${n1} = ${unit} €, y ${n2} × ${unit} = ${fmt(res)} €.` };
    },
    function inversa() {
      const w1 = pick([2, 3, 4, 6]), d1 = pick([6, 8, 10, 12, 15]), total = w1 * d1;
      const opts = [2, 3, 4, 5, 6, 8, 10, 12].filter(w => w !== w1 && total % w === 0);
      const w2 = pick(opts), res = total / w2;
      const { o, a } = options(res, 2);
      return { q: `${w1} auxiliares tardan ${d1} días en digitalizar un archivo. ¿Cuántos días tardarían ${w2} auxiliares al mismo ritmo?`, o: o.map(x => x + " días"), a,
        e: `Regla de tres inversa: ${w1} × ${d1} = ${total} jornadas de trabajo; ${total} / ${w2} = ${fmt(res)} días.` };
    }
  ];
  let counter = 0;
  return function generate(n) {
    return Array.from({ length: n }, () => {
      const g = pick(gens)();
      return { b: "PSI", q: g.q, o: g.o, a: g.a, r: "Psicotécnico", e: g.e, id: "psi-" + (counter++) };
    });
  };
})();
