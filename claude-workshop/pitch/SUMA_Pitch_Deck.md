# Suma — Pitch Deck

Contenido y rationale de cada slide del entregable `pitch/SUMA_Pitch_Deck.pptx`.

- **Formato** — 16:9 (13.333 × 7.5 in), 12 slides, totalmente editable.
- **Idioma** — español (es-MX), como el producto. Se conservan en inglés las dos
  frases de marca que ya existen así en el contexto de producto: la idea central
  del deck y el north star del cierre.
- **Idea central** — *Financial awareness without financial complexity.*
- **Experiencia** — **Habla. Escribe. Fotografía.**

---

## Fuentes de verdad

Todo el contenido sale de estos archivos. No hay una sola cifra, cita o
afirmación fuera de ellos.

| Archivo | Qué aporta |
|---|---|
| `CLAUDE.md` (= `docs/product/CLAUDE.md`) | Visión, objetivos, pipeline, reglas de IA, confianza, alcance P0/P1/P2, north star, escenarios de ejemplo |
| `docs/DESIGN_SYSTEM.md` | Principios, color, tipografía, espaciado, componentes, motion, accesibilidad |
| `src/styles/tokens.css` | Valores exactos de color, tipografía, radio y espaciado |
| `assets/visual-reference/Design.pdf` | Brand guidelines original (texto vectorizado): dirección editorial y specimens de componentes reales |
| `assets/logo/*` | Wordmark, app icon y marca ✚ oficiales |

`docs/brand/` estaba vacía al construir el deck. Las guidelines vivían en
`assets/visual-reference/Design.pdf`, y `docs/DESIGN_SYSTEM.md` es su
transcripción declarada. Se usaron ambas.

---

## Dirección visual

Extensión directa del Suma Design System v1.0, no un tema de pitch genérico.

- **Fondo** `--background #FBFBFA`; superficies `#FFFFFF` con borde `#E4E6E1` y radio 16.
- **Tinta** `--action-primary #131A2A` para titulares, montos y la única acción primaria.
- **Gradiente de marca** (verde → azul profundo → violeta) como **acento raro**:
  solo en la barra de portada y cierre, el app icon y la marca ✚. Nunca como
  fondo de pantalla, tal como exige el sistema.
- **Tipografía** Inter, una sola familia, cifras y titulares con tracking negativo.
  Escala derivada de la del producto (display / h1 / h2 / h3 / body / label / amount).
- **Sin rojo para gastar.** Los montos van en tinta primaria; el color vive en el
  identificador (punto, etiqueta), nunca en el número.
- **Ritmo editorial** — eyebrow numerado `01 · SECCIÓN` como en la doc de marca,
  un titular grande por slide, mucho blanco, una idea por slide.
- **Portada y cierre en tinta** para abrir y cerrar; los diez interiores en claro.

---

## Slides

### 01 · Portada

> **Suma**
> Financial awareness without financial complexity.
> Conciencia financiera, sin complejidad financiera.
> **Habla. Escribe. Fotografía.**

**Rationale.** La portada tiene que decir la promesa antes que la categoría.
El titular en tres líneas fija la idea central; la línea en español la aterriza
para una audiencia es-MX; «Habla. Escribe. Fotografía.» adelanta la mecánica en
tres palabras. Fondo en tinta con el app icon real: premium sin recurrir al
gradiente como fondo, que el sistema prohíbe.

**Fuente.** Wordmark y app icon de `assets/logo/`. North star de `CLAUDE.md §33`.

---

### 02 · El problema

> **Entender tu dinero sigue siendo un trabajo manual.**
> Las preguntas que la gente se hace son simples. El camino para responderlas, no.
>
> `01` Registrar — Abrir la app, elegir un formulario, teclear el monto.
> `02` Categorizar — Decidir a qué cajón pertenece cada compra.
> `03` Revisar — Volver después a corregir lo que quedó mal.
> `04` Entender — Traducir una tabla de gastos en una decisión.
>
> **Lo que la gente quiere saber**
> ¿A dónde se está yendo mi dinero? · ¿Estoy gastando más de lo habitual? ·
> ¿Puedo permitirme algo? · ¿Cuánto puedo ahorrar de forma realista? ·
> ¿Qué podría cambiar para alcanzar una meta? · ¿Qué gastos están afectando mi
> capacidad de ahorrar?

**Rationale.** El problema no es la falta de apps, es la distancia entre una
pregunta humana y el trabajo que hay que hacer para responderla. Por eso la
slide contrasta dos columnas: a la izquierda las cuatro tareas manuales, a la
derecha las seis preguntas reales. Las preguntas van textuales del contexto de
producto: son el problema declarado, no una suposición de mercado.

**Fuente.** `CLAUDE.md §2` (las seis preguntas), `§3 objetivo 1` y `§3 objetivo 7`
(«sin tener que mantener un presupuesto complejo»). La cadena de fricción es
caracterización cualitativa del flujo manual, no un dato medido.

---

### 03 · El insight

> **Las personas ya saben hablar de su dinero.**
> Lo que no deberían necesitar es aprender un sistema financiero para empezar a entenderlo.
>
> **Lo que dices** → «Ayer gasté 180 pesos en Costco en el súper.»
> **Lo que Suma guarda** → Monto $180.00 · Moneda MXN · Concepto Costco ·
> Categoría Súper · Fecha 28 ago 2026 · Entrada Voz

**Rationale.** El insight se demuestra, no se declara: una frase hablada a la
izquierda, seis campos estructurados a la derecha, y una flecha entre las dos.
Es el momento en que el deck deja de ser una promesa. El pie añade la parte
difícil y poco obvia: «ayer» se resuelve contra la zona horaria de la persona y
la fecha del gasto nunca se sobrescribe con la de registro.

**Fuente.** `CLAUDE.md §4.1` (ejemplo y campos extraídos), `§9` (fechas
relativas y la distinción `date` / `createdAt`).

---

### 04 · La idea

> **Habla. Escribe. Fotografía.**
> Suma convierte cualquiera de esas tres entradas en un gasto estructurado, revisable y tuyo.
>
> **Voz** — «Ayer gasté 180 pesos en Costco en el súper.»
> **Texto** — «¿Cuánto llevo gastado en cafés este mes?»
> **Recibo** — Costco · Total $522.00 · 28 ago 2026

**Rationale.** Tres columnas iguales, porque las tres entradas son de primera
clase: ninguna es el modo «real» y las otras el respaldo. Cada tarjeta lleva un
ejemplo literal en vez de una descripción, para que la audiencia oiga cómo suena
usar Suma. El ejemplo de texto es una pregunta, no un registro: adelanta que el
chat no solo captura, también responde.

**Fuente.** `CLAUDE.md §1` (tres entradas), `§5` (tipos de uso del chat),
`§6` y `§29` (recibo Costco $522).

---

### 05 · Cómo funciona

> **Un solo camino, sin importar cómo entres.**
> Voz, texto y recibo entran por el mismo pipeline y salen como el mismo gasto normalizado.
>
> Voz / Texto / Recibo → **Extracción con IA** → **Validación** → **Revisión** →
> **Guardado** → **Insight**
>
> Toda salida del modelo se valida antes de tocar el almacenamiento. Nunca se
> guarda un dato que la persona no haya visto.

**Rationale.** El diagrama es la arquitectura real, no una simplificación de
marketing: tres entradas convergen en un único rail. Se añaden dos etapas que un
deck corriente omitiría —**Validación** antes de **Revisión**— porque son
exactamente la diferencia entre un demo y un producto financiero. La frase de
cierre es la garantía técnica que sostiene la slide 09.

**Fuente.** `CLAUDE.md §7` (pipeline unificado), `§22` (estados de feedback),
`§23` (validación en nueve pasos), `§35` (`validate.ts` antes del almacenamiento).

---

### 06 · La experiencia

> **Cinco superficies, una sola conversación.**
> El hilo es la superficie principal: los datos viven dentro de la conversación.
>
> **Voz** — «Te escucho…» · Cancelar · Escribirlo
> **Texto** — «Pagué 120 pesos por un café» → «Listo, lo registré. Va en Comida.»
>   Café · Hoy · Comida · −$120.00 · ✓ Guardado
> **Recibo** — Comercio Costco · Total $522.00 · Fecha 28 ago 2026 ·
>   Categoría Súper · **Propina: desconocido**
> **Dashboard** — Balance disponible $12,480.50 · «Te alcanza hasta el 31 de agosto» ·
>   Comida $3,240 · Transporte $2,150 · Hogar $1,530
> **Insights** — «Llevas $1,840 en cafés este mes, 23% más que en julio.»

**Rationale.** La slide más visual del deck, y la que carga la tesis de producto:
no hay tab bar de cuatro secciones, hay un hilo con superficies dentro. Cada
frame usa componentes reales del sistema —burbuja de usuario, respuesta en texto
libre firmada con la marca ✚, fila de transacción de 72 px, tarjeta de insight en
violeta de IA, gráfica con su frase interpretativa—. El campo **Propina:
desconocido** está puesto a propósito: es la prueba visible de que Suma no
inventa lo que no pudo leer.

**Honestidad.** Estos frames están **reconstruidos con el design system**, no son
capturas de pantalla. `assets/screenshots/` está vacía y la aplicación aún no
está construida (`src/App.tsx` sigue siendo la plantilla de Vite). El deck lo
dice en el pie de la slide, sin letra chica.

**Fuente.** `DESIGN_SYSTEM.md §9, §10, §12, §13, §14, §16` y los specimens de
componentes de `Design.pdf` (secciones 09–13), de donde salen literalmente las
cifras $12,480.50, $3,240 / $2,150 / $1,530 y el insight de los $1,840.

---

### 07 · La IA

> **No es un chatbot. Es interpretación con reglas.**
> La salida del modelo se trata como entrada no confiable: se valida antes de tocar un registro.
>
> **Extrae estructura** — Monto, moneda, concepto, categoría y fecha, desde voz, texto o una foto.
> **Resuelve el tiempo** — «Ayer», «el viernes pasado», «hace dos días» → fecha exacta en tu zona horaria.
> **Responde con tus datos** — Usa tus ingresos, gastos recurrentes, ahorros y metas. Sin consejos genéricos.
>
> **Cómo habla Suma** — cada frase declara qué tipo de afirmación es:
> `HECHO` «Gastaste $1,240 en restaurantes el mes pasado.»
> `CÁLCULO` «A tu promedio actual, podrías ahorrar aproximadamente $300 al mes.»
> `SUGERENCIA` «Reducir restaurantes 15% liberaría aproximadamente $186 al mes.»
> `INCERTIDUMBRE` «Esta estimación no incluye tu seguro anual porque no lo has agregado.»

**Rationale.** Es la slide diferenciadora. La columna derecha es lo que casi
ningún producto de finanzas con IA hace: separar explícitamente hecho, cálculo,
sugerencia e incertidumbre, y decir en voz alta qué no sabe. Presentarlo como una
escalera de cuatro etiquetas convierte una regla de ingeniería en un argumento de
confianza que se entiende en cinco segundos.

**Fuente.** `CLAUDE.md §13` (las cuatro categorías, con las frases textuales),
`§23`, `§24`. Los importes $1,240 / $300 / $186 son los ejemplos documentados,
no métricas de usuarios.

---

### 08 · De transacciones a decisiones

> **De un dato suelto a una decisión.**
> Cada gasto guardado alimenta el historial, las métricas, el chat y los insights en el mismo momento.
>
> `01` **Transacción** — Café · Hoy · 14:32 · Comida · −$120.00
> `02` **Patrón** — Abr · May · Jun · Jul · **Ago**
> `03` **Insight** — «Llevas $1,840 en cafés este mes, 23% más que en julio.»
> `04` **Decisión** — «Si mueves $500 a tu meta de viaje, la alcanzas dos semanas antes.»
>   [ Mover $500 ] [ Ahora no ]
>
> Toda cifra va acompañada de la frase que la explica.

**Rationale.** Cuatro tarjetas con peso creciente: la última se invierte a tinta
para que la decisión sea, literalmente, el punto más oscuro y más pesado de la
slide. La cadena usa un solo hilo —el café— de principio a fin, para que la
audiencia siga un dato concreto en vez de un concepto. Los dos botones importan:
la decisión sigue siendo de la persona, incluso cuando Suma la propone.

**Fuente.** Fila de transacción, tarjeta de insight y tarjeta de recomendación de
`Design.pdf §09` / `§11`; `CLAUDE.md §17` (los insights se generan de datos reales
y no juzgan), `§28` (el gasto guardado aparece de inmediato en dashboard,
historial, métricas, insights y chat).

---

### 09 · Confianza

> **La IA interpreta. Tú decides.**
> Suma ayuda con la interpretación; no toma en silencio decisiones financieras inciertas.
>
> **Suma entendió** — $180.00 MXN · Concepto Costco · Categoría Súper ·
> Fecha 28 ago 2026 · [ Editar ] [ **Guardar** ]
> Con confianza baja Suma no afirma: «Creo que esto es… ¿es correcto?».
>
> `01` **Muestra lo que entendió** — Cada campo extraído es visible antes de guardar.
> `02` **Permite corregir** — Todo campo es editable. Un error nunca borra lo que dijiste.
> `03` **Pregunta en vez de adivinar** — Si la categoría es ambigua, Suma pregunta en lugar de elegir.
> `04` **No inventa** — Un campo que no se pudo extraer se muestra como desconocido.
> `05` **Nada se guarda sin validar** — Estructura, montos, fechas y categorías se validan antes de persistir.
>
> **Nunca crear ni modificar en silencio un registro financiero cuando la IA no está segura.**

**Rationale.** La tarjeta de revisión real a la izquierda hace concreto lo que las
cinco reglas dicen en abstracto. La regla crítica va al final, en caja y con las
palabras del contexto de producto, porque es la promesa que un producto
financiero no puede permitirse romper. Nótese la jerarquía: «Guardar» es la única
acción primaria de la slide, en tinta, como manda el sistema.

**Fuente.** `CLAUDE.md §11` (revisión, edición, pregunta ante ambigüedad, y el
principio «el usuario mantiene el control»), `§23`, `§24 regla crítica`, `§25`.

---

### 10 · MVP

> **El MVP es un corte vertical, no una demo.**
> Alcance P0: de la captura al insight, completo y accesible. Todo lo demás espera.
>
> **Registro de gastos** — Entrada por voz · texto y chat · foto de recibo ·
> extracción con IA · monto, moneda, concepto, categoría y fecha · fechas
> relativas resueltas · revisión y edición antes de guardar · persistencia.
> **Producto principal** — Historial · dashboard · métricas básicas · chat ·
> insights personalizados básicos · layout web responsivo · alternativas
> textuales accesibles · onboarding simple.
> **Contexto financiero** — Ingreso mensual básico · gastos recurrentes básicos ·
> meta de ahorro opcional · cálculos personalizados.
>
> **Degradación honesta:** sin API key, Suma usa un extractor determinista local y
> nunca inventa un dato que no se pudo extraer.

**Rationale.** El titular evita el reclamo que un deck suele hacer aquí. Se dice
«el MVP **es**» en términos de alcance definido, no «esto **ya funciona**»: el
alcance P0 está documentado, el producto está en construcción. Las tres columnas
respetan la agrupación del contexto de producto para que quien lo conozca
reconozca el recorte. El pie sobre degradación es un argumento de confianza:
cuando el modelo no está disponible, el sistema baja de capacidad sin bajar de
honestidad.

**Fuente.** `CLAUDE.md §26 P0` (literal, en su agrupación original) y `§35`
(extractor determinista local y campos en «desconocido»).

---

### 11 · Hacia dónde

> **Lo que sigue, cuando la base esté firme.**
> Nada de esto está en el MVP. El orden importa: primero voz, texto y recibo →
> gasto estructurado → métricas.
>
> **P1 · Valioso — después del MVP** — Extracción avanzada de recibos · artículos
> individuales · etiquetado de ubicación · categorías personalizables ·
> comparación entre periodos · gráficas avanzadas · correcciones por voz ·
> escenarios de metas financieras · insights más personalizados.
> **P2 · Visión — todavía no** — Integraciones bancarias · importación automática
> de transacciones · finanzas del hogar compartidas · detección de gastos
> recurrentes · presupuestos avanzados · seguimiento de inversiones ·
> multi-cuenta · categorización fiscal.
>
> Los elementos P2 aparecen aquí como dirección, no como compromiso.

**Rationale.** La distinción MVP / futuro se hace **visual**, no solo verbal: P1
en superficie blanca con borde sólido y viñetas en violeta de IA; P2 en
superficie sutil, borde punteado y viñetas grises. Una audiencia que solo mire la
slide de reojo ya entiende que la columna derecha no existe todavía. Se eliminó
una caja redundante con la regla de alcance porque la bajada ya la enuncia:
menos texto, misma idea.

**Fuente.** `CLAUDE.md §26 P1 y P2`, incluida la regla «no ampliar a P2 hasta que
la experiencia central sea estable».

---

### 12 · Cierre

> **Suma**
> **Make financial awareness as easy as telling someone what you bought.**
> Habla. Escribe. Fotografía.
> Suma · Design System v1.0 · WCAG 2.2 AA · es-MX

**Rationale.** El cierre devuelve el north star textual del contexto de producto,
sin adornos. Espeja la portada (tinta, wordmark, barra de gradiente, ahora abajo)
para cerrar el arco. La línea final recuerda que Suma es un sistema, no una
pantalla.

**Fuente.** `CLAUDE.md §33` (north star, literal).

---

## Continuidad narrativa

```
problema        → El camino entre la pregunta y la respuesta es manual.       (02)
insight         → Pero la gente ya sabe decir en qué gastó.                   (03)
idea            → Entonces que decirlo sea la interfaz.                       (04)
mecánica        → Un solo pipeline, con validación y revisión.                (05)
producto        → Cinco superficies dentro de una conversación.               (06)
diferenciador   → La IA interpreta y declara qué tan segura está.             (07)
valor           → Un dato suelto se convierte en una decisión.                (08)
objeción        → ¿Y si se equivoca? Nunca en silencio.                       (09)
alcance         → Esto es el MVP.                                             (10)
horizonte       → Esto es después, y se ve distinto.                          (11)
```

Slides 02→04 plantean y resuelven; 05→08 construyen valor; 09 responde la
objeción que 07 y 08 provocan; 10→11 aterrizan sin sobreprometer.

---

## Información pendiente

Un pitch deck completo suele incluir secciones que **no existen en el repositorio**
y que, por lo tanto, se omitieron en vez de inventarse:

- **Tracción y usuarios** — no hay datos de uso, retención ni pilotos.
- **Tamaño de mercado** — no hay investigación de mercado documentada.
- **Modelo de negocio y pricing** — no hay definición de monetización.
- **Competencia** — no hay análisis competitivo documentado.
- **Equipo** — no hay información de equipo en el proyecto.
- **Ask / financiamiento** — no hay ronda, monto ni uso de fondos definidos.
- **Roadmap con fechas** — `§26` define prioridades (P0/P1/P2), no calendario.
- **Capturas reales del producto** — `assets/screenshots/` está vacía y la app aún
  no está implementada.

Cuando existan, los lugares naturales son: tracción y mercado después de la 09;
modelo de negocio, competencia, equipo y ask después de la 11. El generador está
hecho para que agregar una slide sea añadir una función a `SLIDES`.

---

## Verificaciones hechas

- **Sin desbordes.** El generador mide cada bloque con la Inter real y emite los
  saltos de línea calculados, de modo que PowerPoint no puede re-partir el texto.
  Ninguna caja queda por debajo de lo que su contenido necesita.
- **Sin formas fuera del lienzo.** Verificado sobre el PPTX final: 0 de 446 formas.
- **Una sola familia tipográfica.** 370 runs, todos en Inter.
- **Solo colores del sistema.** Los ocho colores de texto del PPTX
  (`131A2A`, `5A6472`, `767F8C`, `B7BDC6`, `FFFFFF`, `0E7A55`, `4A2BB5`, `2A5CB8`)
  existen todos en `tokens.css`. Ningún hex inventado.
- **Contraste.** Texto primario 16.8:1, secundario 5.8:1, blanco sobre tinta
  17.4:1, positive 5.2:1, ai-accent 9.1:1, info 6.3:1. `disabled-fill` quedó
  restringido a fondos de tinta (9.2:1) y nunca porta información sobre claro,
  como exige el sistema.
- **Logos.** Solo los assets oficiales, recortados a su caja real sin
  redibujarlos ni recolorearlos. Wordmark blanco sobre tinta, marca ✚ en
  gradiente sobre claro, app icon sin alterar. El gradiente nunca es fondo de pantalla.
- **Revisión de conjunto.** Los doce renders de `pitch/preview/` se revisaron uno
  a uno y como secuencia.

### Diferencias detectadas entre fuentes

`Design.pdf` y `tokens.css` no coinciden en dos puntos. Se siguió **`tokens.css`**,
que `CLAUDE.md §34` declara fuente única y cuyos valores son los verificados para
contraste. Vale la pena reconciliarlos en el producto:

| Token | `Design.pdf` | `tokens.css` (usado) |
|---|---|---|
| `warning` | `#C07A00` | `#9A5B00` |
| paleta `chart/1…6` | `0B5C41` · `6D3FD4` · `C07A00` · `9AA1AA` · `E3A0C4` · `A8D3EE` | `0B5C41` · `9A5B00` · `4A2BB5` · `7FB8DE` · `C4699B` · `6B7280` |

También: el sistema pide peso 600 (SemiBold) en titulares. El PPTX usa
`Inter` + bold (700) en vez de declarar la familia «Inter SemiBold», porque el
nombre de familia se resuelve de forma fiable en cualquier máquina y evita que
un equipo sin esa variante caiga a una tipografía por defecto.

---

## Regenerar el deck

```bash
python3 -m venv /tmp/sumaenv && /tmp/sumaenv/bin/pip install python-pptx pillow
/tmp/sumaenv/bin/python pitch/build_deck.py
```

Requiere Inter instalada en `~/Library/Fonts`.

| Archivo | Qué es |
|---|---|
| `pitch/SUMA_Pitch_Deck.pptx` | Entregable editable |
| `pitch/SUMA_Pitch_Deck.md` | Este documento |
| `pitch/build_deck.py` | Contenido y layout de las 12 slides |
| `pitch/deck_core.py` | Motor: tokens, medición de texto, emisión PPTX y PNG |
| `pitch/assets/` | Logos oficiales recortados a su caja real |
| `pitch/preview/` | Render PNG de cada slide, para revisar sin abrir PowerPoint |

El PPTX y los PNG salen de la **misma** especificación de formas, así que el
render revisado y el archivo entregado no pueden divergir.
