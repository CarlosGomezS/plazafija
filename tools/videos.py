#!/usr/bin/env python3
"""Fábrica de vídeos de PlazaFija.

Convierte preguntas del banco en vídeos verticales (1080x1920) para TikTok, Reels y Shorts,
con su texto de publicación y hashtags.

Uso:
    python3 tools/videos.py                 # 10 vídeos al azar
    python3 tools/videos.py --n 200         # 200 vídeos
    python3 tools/videos.py --bloque CE     # solo Constitución
Requisitos: Python 3, Pillow (pip install pillow), ffmpeg y Node.js.
"""
import argparse, csv, json, os, random, subprocess, tempfile, textwrap
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
WEB = os.environ.get("PLAZAFIJA_WEB", "plazafija.pages.dev")
INK, PAPER, CARD, MUTED = (20, 34, 58), (243, 245, 249), (255, 255, 255), (86, 102, 126)
GOLD, OK, LINE, BLUE = (168, 119, 42), (29, 122, 76), (216, 223, 234), (31, 78, 140)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def font(names, size):
    for n in names:
        for d in ("/usr/share/fonts/truetype/dejavu/", "/Library/Fonts/", "C:/Windows/Fonts/", ""):
            try: return ImageFont.truetype(d + n, size)
            except OSError: pass
    return ImageFont.load_default()

SERIF = lambda s: font(["DejaVuSerif-Bold.ttf", "Georgia Bold.ttf", "georgiab.ttf"], s)
SANS = lambda s: font(["DejaVuSans.ttf", "Arial.ttf", "arial.ttf"], s)
SANSB = lambda s: font(["DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"], s)
MONO = lambda s: font(["DejaVuSansMono-Bold.ttf", "Courier New Bold.ttf", "courbd.ttf"], s)

def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=fnt) <= width: cur = test
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def block(draw, xy, text, fnt, fill, width, gap=12):
    x, y = xy
    for ln in wrap(draw, text, fnt, width):
        draw.text((x, y), ln, font=fnt, fill=fill)
        y += fnt.size + gap
    return y

def base(block_name):
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    d.text((80, 120), "PlazaFija", font=SERIF(64), fill=CARD)
    d.text((80, 205), block_name.upper(), font=MONO(30), fill=GOLD)
    d.text((80, H - 150), WEB, font=SANSB(40), fill=CARD)
    d.text((80, H - 95), "Tests de oposiciones con solución", font=SANS(30), fill=(170, 182, 200))
    return img, d

def frame_question(q, block_name, secs, reveal=False):
    img, d = base(block_name)
    d.rounded_rectangle((60, 300, W - 60, H - 220), radius=36, fill=PAPER)
    y = block(d, (110, 350), q["q"], SERIF(54), INK, W - 220, gap=16) + 30
    for i, opt in enumerate(q["o"]):
        right = reveal and i == q["a"]
        fill = (227, 243, 234) if right else CARD
        lines = wrap(d, opt, SANS(42), W - 330)
        hgt = 40 + len(lines) * 54
        d.rounded_rectangle((100, y, W - 100, y + hgt), radius=20, fill=fill, outline=OK if right else LINE, width=4)
        d.ellipse((125, y + hgt / 2 - 30, 185, y + hgt / 2 + 30), fill=OK if right else PAPER, outline=OK if right else LINE, width=3)
        d.text((155, y + hgt / 2), "ABCD"[i], font=SANSB(34), fill=CARD if right else INK, anchor="mm")
        ty = y + 22
        for ln in lines: d.text((215, ty), ln, font=SANS(42), fill=INK); ty += 54
        y += hgt + 18
    if reveal:
        y += 14
        d.text((110, y), q["r"], font=MONO(32), fill=GOLD); y += 52
        expl = q["e"] if len(q["e"]) < 230 else q["e"][:227].rsplit(" ", 1)[0] + "…"
        block(d, (110, y), expl, SANS(36), MUTED, W - 220, gap=10)
    else:
        d.ellipse((W / 2 - 80, H - 420, W / 2 + 80, H - 260), fill=GOLD)
        d.text((W / 2, H - 340), str(secs), font=SANSB(90), fill=CARD, anchor="mm")
    return img

def frame_hook(block_name):
    img, d = base(block_name)
    y = 700
    for ln in ["¿Aprobarías", "esta pregunta", "de oposiciones?"]:
        d.text((W / 2, y), ln, font=SERIF(96), fill=CARD, anchor="mm"); y += 130
    d.text((W / 2, y + 60), "Tienes 5 segundos", font=SANSB(48), fill=GOLD, anchor="mm")
    return img

def frame_cta(total):
    img, d = base("Practica gratis")
    y = 640
    for ln in [f"{total} preguntas", "explicadas con", "su artículo"]:
        d.text((W / 2, y), ln, font=SERIF(92), fill=CARD, anchor="mm"); y += 125
    d.rounded_rectangle((140, y + 60, W - 140, y + 200), radius=70, fill=GOLD)
    d.text((W / 2, y + 130), "Enlace en el perfil", font=SANSB(52), fill=CARD, anchor="mm")
    return img

def render(q, block_name, total, out_path, tmp):
    # (imagen, segundos): gancho 2 s, pregunta con cuenta atrás 5 s, solución 5 s, llamada a la acción 2,5 s
    seq = [(frame_hook(block_name), 2.0)]
    seq += [(frame_question(q, block_name, s), 1.0) for s in range(5, 0, -1)]
    seq += [(frame_question(q, block_name, 0, reveal=True), 5.0), (frame_cta(total), 2.5)]
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as f:
        for i, (img, dur) in enumerate(seq):
            p = os.path.join(tmp, f"f{i}.png"); img.save(p)
            f.write(f"file '{p}'\nduration {dur}\n")
        f.write(f"file '{p}'\n")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest",
                    "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                    "-c:a", "aac", "-movflags", "+faststart", out_path], check=True)

def caption(q, block_name):
    tags = {"CE": "#constitucion", "L39": "#ley39", "L40": "#ley40", "TREBEP": "#trebep"}.get(q["b"], "#temario")
    return (f"¿Sabrías responderla sin mirar? 👇 Déjalo en comentarios: A, B, C o D.\n"
            f"Más tests gratis de {block_name} en el enlace del perfil.\n"
            f"#oposiciones #opositores #auxiliaradministrativo #estudiar {tags} #test")

def load_bank():
    js = ("import('" + os.path.join(ROOT, "src", "questions.js").replace("\\", "/") + "').then(m=>"
          "console.log(JSON.stringify({blocks:m.BLOCKS,q:m.QUESTIONS})))")
    data = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
    qs = [{"b": r[0], "q": r[1], "o": r[2], "a": r[3], "r": r[4], "e": r[5], "id": i} for i, r in enumerate(data["q"])]
    return data["blocks"], qs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=10)
    ap.add_argument("--bloque", default=None)
    ap.add_argument("--salida", default=os.path.join(ROOT, "videos"))
    a = ap.parse_args()
    blocks, qs = load_bank()
    pool = [q for q in qs if (a.bloque is None or q["b"] == a.bloque) and len(q["q"]) < 170 and max(len(o) for o in q["o"]) < 95]
    chosen = random.sample(pool, min(a.n, len(pool)))
    os.makedirs(a.salida, exist_ok=True)
    with open(os.path.join(a.salida, "publicaciones.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f); wr.writerow(["archivo", "texto_publicacion"])
        for k, q in enumerate(chosen, 1):
            name = f"plazafija_{k:03d}_{q['b'].lower()}.mp4"
            with tempfile.TemporaryDirectory() as tmp:
                render(q, blocks[q["b"]]["name"], len(qs), os.path.join(a.salida, name), tmp)
            wr.writerow([name, caption(q, blocks[q["b"]]["name"])])
            print(f"[{k}/{len(chosen)}] {name}")
    print("Listo:", a.salida)

if __name__ == "__main__":
    main()
