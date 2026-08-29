#!/usr/bin/env python3
"""
Pitch deck de Suma — generador.

    /tmp/sumaenv/bin/python pitch/build_deck.py

Salida:
    pitch/SUMA_Pitch_Deck.pptx     entregable editable
    pitch/preview/slide-NN.png     render de revision

Todo el contenido proviene de CLAUDE.md, docs/DESIGN_SYSTEM.md,
src/styles/tokens.css y assets/visual-reference/Design.pdf.
No hay metricas, usuarios, traccion ni resultados inventados.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from deck_core import (  # noqa: E402
    Rect, Grad, Img, Line, Text, measure, nlines, emit_pptx, emit_png,
    INK, SUBTLE, POSITIVE, AI, AI_SUBTLE, DISABLED, BG, SURFACE, SURF_SUBTLE,
    BORDER, BORDER_SUB, T1, T2, T3, WHITE, SUCCESS, ERROR, INFO, CHART,
    DISPLAY, H1, H2, H3, BODY_LG, BODY, BODY_SM, LABEL, CAPTION,
    AMOUNT_LG, AMOUNT, SLIDE_W, SLIDE_H, MARGIN,
)

A = os.path.join(HERE, "assets")
WM_INK   = os.path.join(A, "wordmark-ink.png")
WM_WHITE = os.path.join(A, "wordmark-white.png")
MARK     = os.path.join(A, "mark-gradient.png")
APPICON  = os.path.join(A, "app-icon.png")
WM_RATIO = 1261 / 383.0

EYE_Y, HEAD_Y, FOOT_Y = 0.58, 1.24, 6.92
R = MARGIN            # borde izquierdo
RW = SLIDE_W - 2 * MARGIN


# ------------------------------------------------------------ componentes

def chrome(num, name, dark=False):
    """Fondo, eyebrow numerado y pie. El numerado imita la doc de marca."""
    bg = INK if dark else BG
    s = [Rect(0, 0, SLIDE_W, SLIDE_H, fill=bg)]
    if name:
        s.append(Text(R, EYE_Y, 8.0, 0.24,
                      [(num, "b", INK if not dark else WHITE),
                       ("   " + name.upper(), "b", T2)],
                      size=LABEL, track=2.0, lh=LABEL * 1.3))
    s += [Img(MARK, R, FOOT_Y, 0.15, 0.15),
          Text(SLIDE_W - R - 1.0, FOOT_Y - 0.01, 1.0, 0.22, num,
               size=CAPTION, weight="b", color=T3, align="r",
               track=2.0, lh=CAPTION * 1.3)]
    return s


def card(x, y, w, h, fill=SURFACE, line=BORDER, rad=0.16, dash=False):
    return Rect(x, y, w, h, fill=fill, line=line, rad=rad, dash=dash)


def dot(x, y, color, d=0.085):
    return Rect(x, y, d, d, fill=color, rad=0.02)


def kicker(x, y, w, text, color=T2):
    return Text(x, y, w, 0.2, text, size=LABEL, weight="b", color=color,
                track=2.0, lh=LABEL * 1.3)


def head(text, size=H1, y=HEAD_Y, w=None, x=R, color=T1, align="l", lines=2):
    lh = size * 1.16
    return Text(x, y, w or RW, lines * lh / 72 + 0.04, text, size=size,
                weight="b", color=color, align=align, lh=lh, track=-2.0)


def sub(text, y, w=6.6, x=R, size=BODY_LG, color=T2, lines=2, align="l"):
    lh = size * 1.55
    return Text(x, y, w, lines * lh / 72 + 0.04, text, size=size, color=color,
                align=align, lh=lh)


def note(text, y, w=RW, x=R, color=T2, lines=1, align="l"):
    lh = CAPTION * 1.6
    return Text(x, y, w, lines * lh / 72 + 0.04, text, size=CAPTION,
                color=color, align=align, lh=lh)


def bar(x, y, w, h, pct, color, track_color=SURF_SUBTLE):
    return [Rect(x, y, w, h, fill=track_color, rad=h / 2),
            Rect(x, y, max(h, w * pct), h, fill=color, rad=h / 2)]


def expense_row(x, y, w, h=0.56, name="Café", meta="Hoy · 14:32 · Comida",
                amount="−$120.00", color=CHART[0], size=CAPTION):
    """Fila de transaccion del design system.

    Identificador de color + comercio arriba, metadatos debajo, monto a la
    derecha en tinta primaria. El color nunca toca el numero.
    """
    aw = min(0.95, w * 0.44)
    return [
        card(x, y, w, h, rad=0.10),
        dot(x + 0.12, y + 0.155, color, 0.085),
        Text(x + 0.26, y + 0.12, w - 0.32 - aw, 0.20, name, size=size,
             weight="b", color=T1, lh=size * 1.25),
        Text(x + 0.26, y + 0.34, w - 0.42, 0.18, meta, size=size - 1.2,
             color=T2, lh=(size - 1.2) * 1.25),
        Text(x + w - 0.12 - aw, y + 0.12, aw, 0.22, amount, size=size,
             weight="b", color=T1, align="r", lh=size * 1.25),
    ]


def minichart(x, y, w, h, highlight_last=True):
    """Abr–Ago. Ago = +23% sobre Jul, coherente con el insight mostrado."""
    vals = [0.58, 0.69, 0.63, 0.80, 0.99]
    labs = ["Abr", "May", "Jun", "Jul", "Ago"]
    n = len(vals)
    bw = w / (n + (n - 1) * 0.55)
    gap = bw * 0.55
    out = []
    for i, (v, lb) in enumerate(zip(vals, labs)):
        bx = x + i * (bw + gap)
        bh = h * v
        last = (i == n - 1) and highlight_last
        out.append(Rect(bx, y + h - bh, bw, bh,
                        fill=INK if last else BORDER, rad=0.035))
        out.append(Text(bx - gap / 2, y + h + 0.07, bw + gap, 0.16, lb,
                        size=CAPTION - 1.3, weight="b" if last else "r",
                        color=T1 if last else T2, align="c",
                        lh=(CAPTION - 1.3) * 1.25))
    return out


# ------------------------------------------------------------ slides

def s01_cover():
    s = [Rect(0, 0, SLIDE_W, SLIDE_H, fill=INK),
         Grad(0, 0, SLIDE_W, 0.14)]
    s.append(kicker(R, 1.05, 7.0, "Pitch deck · producto · 2026", DISABLED))
    s.append(Img(WM_WHITE, R, 1.52, 3.40, 3.40 / WM_RATIO))
    s.append(head("Financial awareness\nwithout financial\ncomplexity.",
                  size=46, y=3.18, w=8.5, color=WHITE, lines=3))
    s.append(Text(R, 5.72, 8.0, 0.34,
                  "Conciencia financiera, sin complejidad financiera.",
                  size=H3, color=DISABLED, lh=H3 * 1.4))
    s.append(Text(R, 6.32, 8.0, 0.34, "Habla. Escribe. Fotografía.",
                  size=H3, weight="b", color=WHITE, lh=H3 * 1.4))
    s.append(Img(APPICON, 10.05, 1.45, 2.35, 2.35))
    return {"shapes": s}


def s02_problem():
    s = chrome("02", "El problema")
    s.append(head("Entender tu dinero\nsigue siendo un\ntrabajo manual.",
                  w=6.0, lines=3))
    s.append(sub("Las preguntas que la gente se hace son simples. El camino "
                 "para responderlas, no.", 3.62, w=5.9, lines=2))

    steps = [
        ("01", "Registrar",  "Abrir la app, elegir un formulario, teclear el monto."),
        ("02", "Categorizar", "Decidir a qué cajón pertenece cada compra."),
        ("03", "Revisar",    "Volver después a corregir lo que quedó mal."),
        ("04", "Entender",   "Traducir una tabla de gastos en una decisión."),
    ]
    y = 4.52
    for i, (n, t, d) in enumerate(steps):
        yy = y + i * 0.60
        s.append(Text(R, yy, 0.40, 0.20, n, size=CAPTION, weight="b",
                      color=T3, lh=CAPTION * 1.3))
        s.append(Text(R + 0.42, yy - 0.03, 1.30, 0.22, t, size=BODY,
                      weight="b", color=T1, lh=BODY * 1.25))
        s.append(Text(R + 1.80, yy - 0.02, 4.10, 0.22, d, size=BODY_SM,
                      color=T2, lh=BODY_SM * 1.3))
        if i < len(steps) - 1:
            s.append(Line(R, yy + 0.42, R + 5.90, yy + 0.42, BORDER_SUB, 1))

    cx, cy, cw, ch = 7.55, 1.24, 4.83, 5.28
    s.append(card(cx, cy, cw, ch))
    s.append(kicker(cx + 0.42, cy + 0.46, cw - 0.84, "Lo que la gente quiere saber"))
    qs = ["¿A dónde se está yendo mi dinero?",
          "¿Estoy gastando más de lo habitual?",
          "¿Puedo permitirme algo?",
          "¿Cuánto puedo ahorrar de forma realista?",
          "¿Qué podría cambiar para alcanzar una meta?",
          "¿Qué gastos están afectando mi capacidad de ahorrar?"]
    qy, qs_size = cy + 0.92, 14.0
    qlh = qs_size * 1.35
    for i, q in enumerate(qs):
        hh = nlines(q, cw - 0.84, qs_size, "b") * qlh / 72
        s.append(Text(cx + 0.42, qy, cw - 0.84, hh, q, size=qs_size,
                      weight="b", color=T1, lh=qlh))
        qy += hh + 0.16
        if i < len(qs) - 1:
            s.append(Line(cx + 0.42, qy, cx + cw - 0.42, qy, BORDER_SUB, 1))
            qy += 0.16
    s.append(note("Preguntas documentadas en el contexto de producto de Suma.",
                  qy + 0.02, w=cw - 0.84, x=cx + 0.42))
    return {"shapes": s}


def s03_insight():
    s = chrome("03", "El insight")
    s.append(head("Las personas ya saben\nhablar de su dinero.",
                  size=42, w=11.0, lines=2))
    s.append(sub("Lo que no deberían necesitar es aprender un sistema "
                 "financiero para empezar a entenderlo.", 3.02, w=8.6,
                 size=H3, lines=1))

    y, h = 3.98, 2.42
    s.append(card(R, y, 5.55, h, fill=SURF_SUBTLE, line=BORDER_SUB, rad=0.30))
    s.append(kicker(R + 0.48, y + 0.42, 4.5, "Lo que dices"))
    s.append(Text(R + 0.48, y + 0.86, 4.60, 1.20,
                  "«Ayer gasté 180 pesos\nen Costco en el súper.»",
                  size=H2, weight="b", color=T1, lh=H2 * 1.30, track=-2.0))

    ax = R + 5.55
    s.append(Text(ax, y + h / 2 - 0.18, 0.85, 0.36, "→", size=H2,
                  weight="b", color=T3, align="c", lh=H2 * 1.2))

    fx = ax + 0.85
    fw = SLIDE_W - MARGIN - fx
    s.append(card(fx, y, fw, h))
    s.append(kicker(fx + 0.48, y + 0.42, fw - 0.96, "Lo que Suma guarda"))
    fields = [("Monto", "$180.00"), ("Moneda", "MXN"), ("Concepto", "Costco"),
              ("Categoría", "Súper"), ("Fecha", "28 ago 2026"), ("Entrada", "Voz")]
    for i, (k, v) in enumerate(fields):
        col, row = i % 2, i // 2
        px = fx + 0.48 + col * ((fw - 0.96) / 2)
        py = y + 0.90 + row * 0.48
        s.append(Text(px, py, 1.30, 0.18, k, size=CAPTION, color=T2,
                      lh=CAPTION * 1.25))
        s.append(Text(px, py + 0.18, (fw - 0.96) / 2 - 0.2, 0.24, v,
                      size=BODY, weight="b", color=T1, lh=BODY * 1.25))
    s.append(note("Ejemplo de extracción documentado en el contexto de producto. "
                  "«Ayer» se resuelve contra la zona horaria de la persona: la "
                  "fecha del gasto nunca se sobrescribe con la de registro.",
                  y + h + 0.22, w=11.0, lines=1))
    return {"shapes": s}


def s04_idea():
    s = chrome("04", "La idea")
    s.append(Img(MARK, R, HEAD_Y - 0.06, 0.46, 0.46))
    s.append(head("Habla. Escribe. Fotografía.", size=H1, y=HEAD_Y + 0.58,
                  w=11.5, lines=1))
    s.append(sub("Suma convierte cualquiera de esas tres entradas en un gasto "
                 "estructurado, revisable y tuyo.", 2.68, w=8.8, size=H3,
                 lines=1))

    cols = [
        ("Voz", "«Ayer gasté 180 pesos en\nCostco en el súper.»",
         "Habla como se lo contarías a alguien. Diez estados de voz, "
         "cada uno con texto visible."),
        ("Texto", "«¿Cuánto llevo gastado\nen cafés este mes?»",
         "Registra, corrige y pregunta en el mismo hilo. La conversación "
         "es la app."),
        ("Recibo", "Costco · Total $522.00\n28 ago 2026",
         "Sube o toma la foto. Suma lee lo que hay; lo que no puede leer, "
         "lo pregunta."),
    ]
    w, gap = 3.66, 0.42
    y, h = 3.42, 3.10
    for i, (t, ex, d) in enumerate(cols):
        x = R + i * (w + gap)
        s.append(card(x, y, w, h))
        s.append(Text(x + 0.42, y + 0.44, 2.0, 0.30, t, size=H3, weight="b",
                      color=T1, lh=H3 * 1.25))
        s.append(Line(x + 0.42, y + 0.98, x + w - 0.42, y + 0.98, BORDER_SUB, 1))
        s.append(Text(x + 0.42, y + 1.18, w - 0.84, 0.96, ex, size=BODY_LG,
                      weight="b", color=T1, lh=BODY_LG * 1.42))
        s.append(Text(x + 0.42, y + 2.24, w - 0.84, 0.66, d, size=BODY_SM,
                      color=T2, lh=BODY_SM * 1.45))
    return {"shapes": s}


def s05_how():
    s = chrome("05", "Cómo funciona")
    s.append(head("Un solo camino,\nsin importar cómo entres.", w=8.6, lines=2))
    s.append(sub("Voz, texto y recibo entran por el mismo pipeline y salen "
                 "como el mismo gasto normalizado.", 2.72, w=8.6, lines=1))

    iy = [3.62, 4.32, 5.02]
    for i, (t, y) in enumerate(zip(["Voz", "Texto", "Recibo"], iy)):
        s.append(Rect(R, y, 1.55, 0.50, fill=SUBTLE, rad=0.25))
        s.append(Text(R, y + 0.13, 1.55, 0.24, t, size=BODY, weight="b",
                      color=T1, align="c", lh=BODY * 1.25))
    rail = R + 1.55 + 0.45
    s.append(Line(rail, iy[0] + 0.25, rail, iy[2] + 0.25, BORDER, 1.5))
    for y in iy:
        s.append(Line(R + 1.55, y + 0.25, rail, y + 0.25, BORDER, 1.5))
    s.append(Line(rail, iy[1] + 0.25, rail + 0.42, iy[1] + 0.25, BORDER, 1.5))

    stages = [
        ("Extracción\ncon IA", "Monto, moneda, concepto,\ncategoría y fecha."),
        ("Validación", "Estructura, tipos, fechas\ny categorías."),
        ("Revisión", "Suma muestra lo que\nentendió. Todo editable."),
        ("Guardado", "Fila optimista, confirmación\ny «Deshacer» 5 s."),
        ("Insight", "Alimenta historial, métricas,\nchat e insights."),
    ]
    sx, sw, sgap = rail + 0.42, 1.70, 0.14
    for i, (t, d) in enumerate(stages):
        x = sx + i * (sw + sgap)
        s.append(card(x, 3.62, sw, 1.30))
        s.append(Text(x + 0.20, 3.86, sw - 0.40, 0.62, t, size=BODY,
                      weight="b", color=T1, align="c", lh=BODY * 1.28))
        s.append(Text(x + 0.14, 5.06, sw - 0.28, 0.62, d, size=CAPTION,
                      color=T2, align="c", lh=CAPTION * 1.5))
        if i < len(stages) - 1:
            s.append(Text(x + sw, 4.14, sgap, 0.30, "›", size=BODY_LG,
                          weight="b", color=T3, align="c",
                          lh=BODY_LG * 1.2))

    s.append(Line(R, 6.18, SLIDE_W - MARGIN, 6.18, BORDER, 1))
    s.append(Text(R, 6.36, 11.4, 0.30,
                  [("Toda salida del modelo se valida antes de tocar el "
                    "almacenamiento. ", "b", T1),
                   ("Nunca se guarda un dato que la persona no haya visto.",
                    "r", T2)],
                  size=BODY, lh=BODY * 1.4))
    return {"shapes": s}


def _frame(x, y, w, h, label):
    return [card(x, y, w, h),
            kicker(x + 0.18, y + 0.20, w - 0.36, label)]


def s06_experience():
    s = chrome("06", "La experiencia")
    s.append(head("Cinco superficies,\nuna sola conversación.", w=8.6, lines=2))
    s.append(sub("El hilo es la superficie principal: los datos viven dentro "
                 "de la conversación.", 2.72, w=8.8, lines=1))

    w, h, y, gap = 2.10, 3.16, 3.34, 0.26
    xs = [0.90 + i * (w + gap) for i in range(5)]

    # 1 · Voz
    x = xs[0]
    s += _frame(x, y, w, h, "Voz")
    s.append(Rect(x + w / 2 - 0.44, y + 0.78, 0.88, 0.88, fill=SURF_SUBTLE,
                  rad=0.44, kind="oval"))
    s.append(Img(MARK, x + w / 2 - 0.22, y + 1.00, 0.44, 0.44))
    s.append(Text(x + 0.14, y + 1.86, w - 0.28, 0.24, "Te escucho…",
                  size=BODY, weight="b", color=T1, align="c", lh=BODY * 1.25))
    s.append(Text(x + 0.14, y + 2.16, w - 0.28, 0.22, "Cancelar · Escribirlo",
                  size=CAPTION, color=T2, align="c", lh=CAPTION * 1.3))
    s.append(Text(x + 0.18, y + 2.56, w - 0.36, 0.52,
                  "Diez estados, cada uno con texto visible.",
                  size=CAPTION, color=T2, align="c", lh=CAPTION * 1.45))

    # 2 · Texto
    x = xs[1]
    s += _frame(x, y, w, h, "Texto")
    s.append(Rect(x + 0.44, y + 0.54, w - 0.62, 0.56, fill=SURF_SUBTLE, rad=0.20))
    s.append(Text(x + 0.58, y + 0.66, w - 0.90, 0.36,
                  "Pagué 120 pesos por un café", size=CAPTION, color=T1,
                  align="r", lh=CAPTION * 1.45))
    s.append(Img(MARK, x + 0.18, y + 1.24, 0.16, 0.16))
    s.append(Text(x + 0.40, y + 1.20, w - 0.58, 0.40,
                  [("Listo, lo registré. Va en ", "r", T1),
                   ("Comida.", "b", T1)],
                  size=CAPTION, lh=CAPTION * 1.45))
    s += expense_row(x + 0.40, y + 1.70, w - 0.58, h=0.56, meta="Hoy · Comida")
    s.append(dot(x + 0.42, y + 2.38, SUCCESS, 0.09))
    s.append(Text(x + 0.56, y + 2.35, 1.2, 0.20, "Guardado", size=CAPTION,
                  weight="b", color=SUCCESS, lh=CAPTION * 1.3))
    s.append(Text(x + 0.18, y + 2.66, w - 0.36, 0.36,
                  "El dato vive dentro de la respuesta.",
                  size=CAPTION, color=T2, lh=CAPTION * 1.45))

    # 3 · Recibo
    x = xs[2]
    s += _frame(x, y, w, h, "Recibo")
    s.append(card(x + w / 2 - 0.32, y + 0.52, 0.64, 0.82, fill=SURF_SUBTLE,
                  line=BORDER, rad=0.06))
    for i, ww in enumerate([0.40, 0.30, 0.36, 0.22]):
        s.append(Rect(x + w / 2 - 0.22, y + 0.68 + i * 0.15, ww, 0.045,
                      fill=BORDER, rad=0.02))
    rows = [("Comercio", "Costco", T1), ("Total", "$522.00", T1),
            ("Fecha", "28 ago 2026", T1), ("Categoría", "Súper", T1),
            ("Propina", "desconocido", T2)]
    for i, (k, v, col) in enumerate(rows):
        ry = y + 1.34 + i * 0.27
        s.append(Text(x + 0.18, ry, 0.85, 0.20, k, size=CAPTION, color=T2,
                      lh=CAPTION * 1.3))
        s.append(Text(x + 0.90, ry, w - 1.08, 0.20, v, size=CAPTION,
                      weight="b" if col == T1 else "r", color=col, align="r",
                      lh=CAPTION * 1.3))
        if i < len(rows) - 1:
            s.append(Line(x + 0.18, ry + 0.24, x + w - 0.18, ry + 0.24,
                          BORDER_SUB, 1))
    s.append(Text(x + 0.18, y + 2.72, w - 0.36, 0.36,
                  "Lo ilegible se marca, no se inventa.",
                  size=CAPTION, color=T2, lh=CAPTION * 1.45))

    # 4 · Dashboard
    x = xs[3]
    s += _frame(x, y, w, h, "Dashboard")
    s.append(Text(x + 0.18, y + 0.54, w - 0.36, 0.20, "Balance disponible",
                  size=CAPTION, color=T2, lh=CAPTION * 1.3))
    s.append(Text(x + 0.18, y + 0.76, w - 0.36, 0.30, "$12,480.50",
                  size=AMOUNT, weight="b", color=T1, lh=AMOUNT * 1.15))
    s.append(Text(x + 0.18, y + 1.10, w - 0.36, 0.38,
                  "Te alcanza hasta el 31 de agosto", size=CAPTION, color=T2,
                  lh=CAPTION * 1.4))
    s.append(Line(x + 0.18, y + 1.60, x + w - 0.18, y + 1.60, BORDER_SUB, 1))
    s.append(kicker(x + 0.18, y + 1.72, w - 0.36, "Por categoría"))
    cats = [("Comida", "$3,240", 1.00, CHART[0]),
            ("Transporte", "$2,150", 0.66, CHART[1]),
            ("Hogar", "$1,530", 0.47, CHART[2])]
    for i, (nm, amt, pct, col) in enumerate(cats):
        ry = y + 2.02 + i * 0.38
        s.append(dot(x + 0.18, ry + 0.045, col, 0.08))
        s.append(Text(x + 0.31, ry, 0.80, 0.20, nm, size=CAPTION, color=T1,
                      lh=CAPTION * 1.3))
        s += bar(x + 1.06, ry + 0.055, 0.36, 0.07, pct, col)
        s.append(Text(x + 1.46, ry, w - 1.64, 0.20, amt, size=CAPTION,
                      weight="b", color=T1, align="r", lh=CAPTION * 1.3))

    # 5 · Insights
    x = xs[4]
    s += _frame(x, y, w, h, "Insights")
    s.append(dot(x + 0.18, y + 0.55, AI, 0.09))
    s.append(Text(x + 0.32, y + 0.52, w - 0.50, 0.20, "Insight financiero",
                  size=CAPTION - 0.5, weight="b", color=AI, track=2.0,
                  lh=CAPTION * 1.3))
    s.append(Text(x + 0.18, y + 0.82, w - 0.36, 0.80,
                  [("Llevas ", "r", T1), ("$1,840", "b", T1),
                   (" en cafés este mes, ", "r", T1), ("23% más", "b", T1),
                   (" que en julio.", "r", T1)],
                  size=CAPTION, lh=CAPTION * 1.5))
    s += minichart(x + 0.24, y + 1.66, w - 0.48, 0.80)
    s.append(Text(x + 0.18, y + 2.74, w - 0.36, 0.36,
                  "Ninguna gráfica sin la frase que la explica.",
                  size=CAPTION, color=T2, lh=CAPTION * 1.45))

    s.append(note("Interfaces reconstruidas con los componentes del Suma Design "
                  "System v1.0. No son capturas del producto: la aplicación "
                  "está en construcción.", 6.62, w=11.4))
    return {"shapes": s}


def s07_ai():
    s = chrome("07", "La IA")
    s.append(head("No es un chatbot.\nEs interpretación\ncon reglas.",
                  y=1.20, w=5.55, lines=3))
    s.append(sub("La salida del modelo se trata como entrada no confiable: se "
                 "valida antes de tocar un registro.", 3.06, w=5.55, lines=2))

    caps = [
        ("Extrae estructura",
         "Monto, moneda, concepto, categoría y fecha, desde voz, texto o una foto."),
        ("Resuelve el tiempo",
         "«Ayer», «el viernes pasado», «hace dos días» → fecha exacta en tu zona "
         "horaria."),
        ("Responde con tus datos",
         "Usa tus ingresos, gastos recurrentes, ahorros y metas. Sin consejos "
         "genéricos."),
    ]
    y = 3.94
    for i, (t, d) in enumerate(caps):
        yy = y + i * 0.94
        s.append(Text(R, yy, 5.3, 0.26, t, size=H3, weight="b", color=T1,
                      lh=H3 * 1.25))
        s.append(Text(R, yy + 0.30, 5.3, 0.50, d, size=BODY_SM, color=T2,
                      lh=BODY_SM * 1.45))
        if i < len(caps) - 1:
            s.append(Line(R, yy + 0.80, R + 5.30, yy + 0.80, BORDER_SUB, 1))

    cx, cy, cw, ch = 6.90, 1.24, 5.48, 5.28
    s.append(card(cx, cy, cw, ch))
    s.append(kicker(cx + 0.46, cy + 0.46, cw - 0.92, "Cómo habla Suma"))
    s.append(Text(cx + 0.46, cy + 0.78, cw - 0.92, 0.44,
                  "Cada frase declara qué tipo de afirmación es.",
                  size=BODY, color=T2, lh=BODY * 1.45))
    tiers = [
        ("Hecho", INK, "Gastaste $1,240 en restaurantes el mes pasado."),
        ("Cálculo", INFO, "A tu promedio actual, podrías ahorrar aproximadamente "
                          "$300 al mes."),
        ("Sugerencia", AI, "Reducir restaurantes 15% liberaría aproximadamente "
                           "$186 al mes."),
        ("Incertidumbre", T2, "Esta estimación no incluye tu seguro anual porque "
                              "no lo has agregado."),
    ]
    ty = cy + 1.42
    for i, (lab, col, txt) in enumerate(tiers):
        yy = ty + i * 1.00
        s.append(dot(cx + 0.46, yy + 0.025, col, 0.09))
        s.append(Text(cx + 0.62, yy, 2.0, 0.20, lab.upper(), size=CAPTION - 0.5,
                      weight="b", color=col, track=2.0, lh=CAPTION * 1.3))
        s.append(Text(cx + 0.46, yy + 0.26, cw - 0.92, 0.56, "«" + txt + "»",
                      size=BODY, weight="b", color=T1, lh=BODY * 1.45))
        if i < len(tiers) - 1:
            s.append(Line(cx + 0.46, yy + 0.86, cx + cw - 0.46, yy + 0.86,
                          BORDER_SUB, 1))
    return {"shapes": s}


def s08_decisions():
    s = chrome("08", "De transacciones a decisiones")
    s.append(head("De un dato suelto\na una decisión.", w=8.0, lines=2))
    s.append(sub("Cada gasto guardado alimenta el historial, las métricas, el "
                 "chat y los insights en el mismo momento.", 2.72, w=8.8,
                 lines=1))

    labs = ["Transacción", "Patrón", "Insight", "Decisión"]
    w, gap, y, h = 2.66, 0.28, 3.46, 2.90
    xs = [R + i * (w + gap) for i in range(4)]
    for i, (x, lb) in enumerate(zip(xs, labs)):
        s.append(card(x, y, w, h,
                      fill=SURFACE if i < 3 else INK,
                      line=BORDER if i < 3 else INK))
        s.append(kicker(x + 0.28, y + 0.28, w - 0.56, lb,
                        T3 if i < 3 else DISABLED))
        if i < 3:
            s.append(Text(x + 0.28, y + 0.56, 0.5, 0.18, f"0{i+1}",
                          size=CAPTION, weight="b", color=T3,
                          lh=CAPTION * 1.3))
        if i < 3:
            s.append(Text(x + w, y + h / 2 - 0.14, gap, 0.28, "›",
                          size=BODY_LG, weight="b", color=T3,
                          align="c", lh=BODY_LG * 1.2))

    # 01 transacción
    x = xs[0]
    s += expense_row(x + 0.28, y + 0.96, w - 0.56, h=0.56, size=BODY_SM)
    s.append(Text(x + 0.28, y + 1.74, w - 0.56, 0.80,
                  "Un gasto registrado por voz, texto o recibo, ya validado.",
                  size=BODY_SM, color=T2, lh=BODY_SM * 1.5))

    # 02 patrón
    x = xs[1]
    s += minichart(x + 0.34, y + 0.96, w - 0.68, 0.86)
    s.append(Text(x + 0.28, y + 2.14, w - 0.56, 0.52,
                  "La misma categoría a lo largo de cinco meses.",
                  size=BODY_SM, color=T2, lh=BODY_SM * 1.5))

    # 03 insight
    x = xs[2]
    s.append(Text(x + 0.28, y + 0.96, w - 0.56, 1.24,
                  [("Llevas ", "r", T1), ("$1,840", "b", T1),
                   (" en cafés este mes, ", "r", T1), ("23% más", "b", T1),
                   (" que en julio.", "r", T1)],
                  size=BODY_LG, lh=BODY_LG * 1.42))
    s.append(Text(x + 0.28, y + 2.26, w - 0.56, 0.56,
                  "Específico, con dato detrás y sin juicio.",
                  size=BODY_SM, color=T2, lh=BODY_SM * 1.5))

    # 04 decisión
    x = xs[3]
    s.append(Text(x + 0.28, y + 0.86, w - 0.56, 1.20,
                  [("Si mueves ", "r", WHITE), ("$500", "b", WHITE),
                   (" a tu meta de viaje, la alcanzas ", "r", WHITE),
                   ("dos semanas antes", "b", WHITE), (".", "r", WHITE)],
                  size=BODY_LG, lh=BODY_LG * 1.42))
    s.append(Rect(x + 0.28, y + 2.14, 1.16, 0.42, fill=WHITE, rad=0.11))
    s.append(Text(x + 0.28, y + 2.24, 1.16, 0.22, "Mover $500", size=CAPTION,
                  weight="b", color=INK, align="c", lh=CAPTION * 1.3))
    s.append(Text(x + 1.52, y + 2.24, 0.90, 0.22, "Ahora no", size=CAPTION,
                  weight="b", color=DISABLED, align="c", lh=CAPTION * 1.3))

    s.append(note("Toda cifra va acompañada de la frase que la explica: nunca "
                  "una gráfica sin conclusión, nunca una recomendación sin el "
                  "dato que la sostiene.", 6.54, w=11.4))
    return {"shapes": s}


def s09_trust():
    s = chrome("09", "Confianza")
    s.append(head("La IA interpreta.\nTú decides.", w=6.0, lines=2))
    s.append(sub("Suma ayuda con la interpretación; no toma en silencio "
                 "decisiones financieras inciertas.", 2.86, w=5.6, lines=2))

    cx, cy, cw, ch = R, 3.72, 4.60, 2.74
    s.append(card(cx, cy, cw, ch))
    s.append(kicker(cx + 0.34, cy + 0.32, cw - 0.68, "Suma entendió"))
    s.append(Text(cx + 0.34, cy + 0.62, cw - 0.68, 0.46,
                  [("$180.00", "b", T1), (" MXN", "b", T3)],
                  size=AMOUNT_LG, color=T1, lh=AMOUNT_LG * 1.15, track=-2.0))
    pairs = [("Concepto", "Costco"), ("Categoría", "Súper"),
             ("Fecha", "28 ago 2026")]
    for i, (k, v) in enumerate(pairs):
        ry = cy + 1.24 + i * 0.30
        s.append(Text(cx + 0.34, ry, 1.3, 0.20, k, size=CAPTION, color=T2,
                      lh=CAPTION * 1.3))
        s.append(Text(cx + 1.60, ry, cw - 1.94, 0.20, v, size=CAPTION,
                      weight="b", color=T1, lh=CAPTION * 1.3))
    s.append(Rect(cx + 0.34, cy + 2.22, 1.24, 0.42, fill=SUBTLE, rad=0.11))
    s.append(Text(cx + 0.34, cy + 2.32, 1.24, 0.22, "Editar", size=CAPTION,
                  weight="b", color=T1, align="c", lh=CAPTION * 1.3))
    s.append(Rect(cx + 1.68, cy + 2.22, 1.24, 0.42, fill=INK, rad=0.11))
    s.append(Text(cx + 1.68, cy + 2.32, 1.24, 0.22, "Guardar", size=CAPTION,
                  weight="b", color=WHITE, align="c", lh=CAPTION * 1.3))
    s.append(note("Con confianza baja Suma no afirma: «Creo que esto es… "
                  "¿es correcto?».", cy + ch + 0.18, w=cw))

    px, pw = 6.90, 5.48
    rules = [
        ("Muestra lo que entendió",
         "Cada campo extraído es visible antes de guardar."),
        ("Permite corregir",
         "Todo campo es editable. Un error nunca borra lo que dijiste."),
        ("Pregunta en vez de adivinar",
         "Si la categoría es ambigua, Suma pregunta en lugar de elegir."),
        ("No inventa",
         "Un campo que no se pudo extraer se muestra como desconocido."),
        ("Nada se guarda sin validar",
         "Estructura, montos, fechas y categorías se validan antes de persistir."),
    ]
    for i, (t, d) in enumerate(rules):
        yy = 1.26 + i * 0.94
        s.append(Text(px, yy, 0.42, 0.20, f"0{i+1}", size=CAPTION, weight="b",
                      color=T3, lh=CAPTION * 1.3))
        s.append(Text(px + 0.46, yy - 0.04, pw - 0.46, 0.26, t, size=H3,
                      weight="b", color=T1, lh=H3 * 1.25))
        s.append(Text(px + 0.46, yy + 0.28, pw - 0.46, 0.44, d, size=BODY_SM,
                      color=T2, lh=BODY_SM * 1.45))
        if i < len(rules) - 1:
            s.append(Line(px, yy + 0.76, px + pw, yy + 0.76, BORDER_SUB, 1))

    s.append(Rect(px, 5.92, pw, 0.86, fill=SUBTLE, rad=0.16))
    s.append(Text(px + 0.30, 6.10, pw - 0.60, 0.54,
                  "Nunca crear ni modificar en silencio un registro financiero "
                  "cuando la IA no está segura.",
                  size=BODY, weight="b", color=T1, lh=BODY * 1.42))
    return {"shapes": s}


def s10_mvp():
    s = chrome("10", "MVP")
    s.append(head("El MVP es un corte vertical,\nno una demo.", w=9.4, lines=2))
    s.append(sub("Alcance P0: de la captura al insight, completo y accesible. "
                 "Todo lo demás espera.", 2.72, w=8.8, lines=1))

    cols = [
        ("Registro de gastos", [
            "Entrada por voz",
            "Entrada por texto y chat",
            "Foto de recibo",
            "Extracción con IA",
            "Monto, moneda, concepto,\ncategoría y fecha",
            "Fechas relativas resueltas",
            "Revisión y edición antes de guardar",
            "Persistencia del gasto"]),
        ("Producto principal", [
            "Historial de gastos",
            "Dashboard",
            "Métricas básicas",
            "Chat",
            "Insights personalizados básicos",
            "Layout web responsivo",
            "Alternativas textuales accesibles",
            "Onboarding simple"]),
        ("Contexto financiero", [
            "Ingreso mensual básico",
            "Gastos recurrentes básicos",
            "Meta de ahorro opcional",
            "Cálculos personalizados"]),
    ]
    w, gap, y, h = 3.66, 0.42, 3.34, 3.08
    for i, (title, items) in enumerate(cols):
        x = R + i * (w + gap)
        s.append(card(x, y, w, h))
        s.append(Text(x + 0.34, y + 0.30, w - 0.68, 0.32, title, size=H3,
                      weight="b", color=T1, lh=H3 * 1.25))
        s.append(Line(x + 0.34, y + 0.74, x + w - 0.34, y + 0.74, BORDER_SUB, 1))
        iy = y + 0.88
        for it in items:
            nl = it.count("\n") + 1
            s.append(dot(x + 0.34, iy + 0.055, POSITIVE, 0.075))
            s.append(Text(x + 0.52, iy - 0.02, w - 0.86, nl * 0.20 + 0.06, it,
                          size=BODY_SM, color=T1, lh=BODY_SM * 1.38))
            iy += 0.206 * nl + 0.035

    s.append(Text(R, 6.56, RW, 0.24,
                  [("Degradación honesta: ", "b", T1),
                   ("sin API key, Suma usa un extractor determinista local y "
                    "nunca inventa un dato que no se pudo extraer.", "r", T2)],
                  size=BODY_SM, lh=BODY_SM * 1.42))
    return {"shapes": s}


def s11_future():
    s = chrome("11", "Hacia dónde")
    s.append(head("Lo que sigue, cuando\nla base esté firme.", w=8.4, lines=2))
    s.append(sub("Nada de esto está en el MVP. El orden importa: primero "
                 "voz, texto y recibo → gasto estructurado → métricas.",
                 2.72, w=8.8, lines=1))

    y, h, gap = 3.34, 3.08, 0.42
    w1 = (RW - gap) / 2
    cols = [
        (R, w1, "P1", "Valioso — después del MVP", AI, AI_SUBTLE, SURFACE,
         BORDER, False, T1, AI,
         ["Extracción avanzada de recibos", "Artículos individuales del recibo",
          "Etiquetado de ubicación", "Categorías personalizables",
          "Comparación entre periodos", "Gráficas avanzadas",
          "Correcciones por voz", "Escenarios de metas financieras",
          "Insights más personalizados"]),
        (R + w1 + gap, w1, "P2", "Visión — todavía no", T2, SURFACE,
         SURF_SUBTLE, DISABLED, True, T2, T3,
         ["Integraciones bancarias", "Importación automática de transacciones",
          "Finanzas del hogar compartidas", "Detección de gastos recurrentes",
          "Presupuestos avanzados", "Seguimiento de inversiones",
          "Soporte multi-cuenta", "Categorización fiscal"]),
    ]
    for (x, w, tag, title, tagc, tagbg, fill, ln, dsh, txtc, dotc,
         items) in cols:
        s.append(card(x, y, w, h, fill=fill, line=ln, dash=dsh))
        s.append(Rect(x + 0.34, y + 0.30, 0.86, 0.30, fill=tagbg, rad=0.15))
        s.append(Text(x + 0.34, y + 0.36, 0.86, 0.22, tag, size=CAPTION,
                      weight="b", color=tagc, align="c", track=2.0,
                      lh=CAPTION * 1.3))
        s.append(Text(x + 1.34, y + 0.30, w - 1.68, 0.32, title, size=H3,
                      weight="b", color=txtc, lh=H3 * 1.30))
        s.append(Line(x + 0.34, y + 0.74, x + w - 0.34, y + 0.74,
                      BORDER_SUB if not dsh else BORDER, 1))
        for i, it in enumerate(items):
            iy = y + 0.88 + i * 0.241
            s.append(dot(x + 0.34, iy + 0.045, dotc, 0.075))
            s.append(Text(x + 0.52, iy - 0.02, w - 0.86, 0.22, it,
                          size=BODY_SM, color=txtc, lh=BODY_SM * 1.35))

    s.append(note("Los elementos P2 aparecen aquí como dirección, no como "
                  "compromiso: ninguno está construido ni prometido en el MVP.",
                  6.56, w=RW))
    return {"shapes": s}


def s12_closing():
    s = [Rect(0, 0, SLIDE_W, SLIDE_H, fill=INK),
         Grad(0, SLIDE_H - 0.14, SLIDE_W, 0.14)]
    wmw = 3.10
    s.append(Img(WM_WHITE, (SLIDE_W - wmw) / 2, 1.72, wmw, wmw / WM_RATIO))
    s.append(head("Make financial awareness as easy\nas telling someone what "
                  "you bought.", size=36, y=3.32, w=11.4, x=MARGIN,
                  color=WHITE, align="c", lines=2))
    s.append(Text(MARGIN, 5.08, 11.4, 0.36, "Habla. Escribe. Fotografía.",
                  size=H3, weight="b", color=DISABLED, align="c", lh=H3 * 1.4))
    s.append(Text(MARGIN, 6.42, 11.4, 0.24,
                  "Suma · Design System v1.0 · WCAG 2.2 AA · es-MX",
                  size=CAPTION, weight="b", color=DISABLED, align="c",
                  track=2.0, lh=CAPTION * 1.4))
    return {"shapes": s}


SLIDES = [s01_cover, s02_problem, s03_insight, s04_idea, s05_how,
          s06_experience, s07_ai, s08_decisions, s09_trust, s10_mvp,
          s11_future, s12_closing]


def main():
    decks = [f() for f in SLIDES]
    bad = 0
    for i, spec in enumerate(decks, 1):
        for s, need in measure(spec["shapes"]):
            bad += 1
            txt = "".join(t for t, _, _ in
                          [x for line in s.lines for x in line])[:58]
            print(f"  ! slide {i:02d}  caja {s.h:.2f}\" necesita {need:.2f}\"  "
                  f"({len(s.lines)} líneas)  «{txt}»")
    print(f"\nDesbordes de texto: {bad}")

    out = os.path.join(HERE, "SUMA_Pitch_Deck.pptx")
    emit_pptx(decks, out)
    print("PPTX  ->", os.path.relpath(out, ROOT))
    pngs = emit_png(decks, os.path.join(HERE, "preview"))
    print("PNG   ->", os.path.relpath(os.path.dirname(pngs[0]), ROOT),
          f"({len(pngs)} slides)")
    return bad


if __name__ == "__main__":
    sys.exit(0 if main() == 0 else 1)
