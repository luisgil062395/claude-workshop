# Suma Design System v1.0 — es-MX · Light mode primero · WCAG 2.2 AA

> "Como hablar con alguien que entiende tus finanzas."

Fuente: brand guidelines (Claude Design canvas `a72dfde1-7c88-4ba2-93a0-c42bb253c0bc`).
Los tokens viven en `src/styles/tokens.css`. **Nunca uses hex crudo en componentes.**

## 1. Principios

1. **Conversación primero** — el hilo es la superficie principal. Los datos financieros viven dentro de la conversación.
2. **UX financiera calmada** — sin rojo/verde agresivo. El gasto se comunica con jerarquía y tinta neutra.
3. **Carga cognitiva mínima** — una idea por pantalla, una acción primaria por vista.
4. **Humano y cercano** — tono de tú, frases cortas, cero jerga contable.
5. **Datos comprensibles** — toda cifra va con una frase que la explica. Nunca una gráfica sin conclusión.
6. **La voz es de primera clase** — diez estados, siempre con equivalente textual visible.

## 2. Color

El gradiente de marca (verde → azul profundo → violeta) es un acento **raro**: identidad, voz activa y avatar de IA. Nunca como fondo de pantalla.

La acción primaria es **tinta neutra `#131A2A`**, no verde: el verde queda libre para significar "positivo".

| Token | Valor | Uso |
|---|---|---|
| `--brand-green` | `#2E9E6B` | gradiente de marca |
| `--brand-deep` | `#12314F` | gradiente de marca |
| `--brand-violet` | `#5B34D6` | gradiente de marca |
| `--action-primary` | `#131A2A` | tinta, 15.4:1 |
| `--action-hover` | `#26313F` | |
| `--action-pressed` | `#0A121F` | |
| `--action-subtle` | `#F1F2EF` | fondo de ghost |
| `--positive` | `#0E7A55` | ingreso, éxito |
| `--ai-accent` | `#4A2BB5` | IA, insight, ahorro |
| `--ai-subtle` | `#EDE8FD` | |
| `--disabled-fill` | `#B7BDC6` | |
| `--background` | `#FBFBFA` | |
| `--surface` | `#FFFFFF` | |
| `--surface-subtle` | `#F4F5F3` | |
| `--border` | `#E4E6E1` | |
| `--border-subtle` | `#EFF0EC` | |
| `--text-primary` | `#131A2A` | 15.4:1 |
| `--text-secondary` | `#5A6472` | 6.1:1 |
| `--text-tertiary` | `#767F8C` | 4.6:1 |
| `--text-disabled` | `#B7BDC6` | nunca informativo |
| `--success` | `#0E7A55` | gasto guardado, meta cumplida |
| `--warning` | `#9A5B00` | cerca del límite |
| `--error` | `#B3261E` | no se pudo guardar |
| `--info` | `#2A5CB8` | contexto, tips |

### Semántica financiera
- `fin/income` → `+ $18,400` — identificador verde + signo `+` + etiqueta "Ingreso".
- `fin/expense` → `− $120.00` — **tinta neutra, no rojo. Gastar no es un error.**
- `fin/savings` → violeta de marca para ahorro y metas.
- `fin/neutral` → promedios y referencias, sin juicio.

**Hacer:** las cifras siempre en tinta primaria; el color vive en el identificador (punto, icono, etiqueta).
**No hacer:** colorear montos por categoría o signo; usar el gradiente como fondo de pantalla.

## 3. Tipografía

Una sola familia: grotesque neutro. Inter como sustituto abierto, stack del sistema al final. Cifras siempre `tabular-nums`.

| Rol | Tamaño/Interlínea | Peso | Tracking |
|---|---|---|---|
| display | 40/44 | 600 | −3.5% |
| h1 | 30/36 | 600 | −3% |
| h2 | 24/30 | 600 | −2% |
| h3 | 19/26 | 600 | — |
| body-lg | 18/28 | 400 | — |
| body | 16/26 | 400 | — |
| body-sm | 14/22 | 400 | — |
| label | 13/17 | 600 | +2% |
| caption | 12/16 | 500 | — |
| amount-lg | 34/38 | 600 | tabular |
| amount | 20/24 | 600 | tabular |
| chat-msg | 16.5/27 | 400 | medida 38–44 caracteres en móvil |

## 4. Espaciado y layout

Escala base 4: `4 8 12 16 20 24 32 40 48 64`.

- **Móvil 360–428** — margen 16px, chat a ancho completo, composer fijo abajo con safe-area, header 56px.
- **Tablet 768+** — margen 32px, contenido centrado a 640px.
- **Escritorio 1024+** — sidebar 280px + hilo centrado a 720px máx. Nunca ancho completo.

## 5. Radio y elevación

`xs 4` (tags, barras) · `sm 8` (inputs chicos) · `md 12` (botones, campos) · `lg 16` (tarjetas) · `xl 24` (burbujas, sheets) · `full` (chips, voz, avatar).

Sombra: `none` en listas y filas · `subtle` en tarjetas de insight · `medium` en composer flotante y FAB · `high` en sheets, modales, menús. La jerarquía se resuelve con contraste de superficie, no con sombras.

## 6. Iconografía

**Phosphor Icons** es la librería oficial. Regular por defecto, Bold para el ítem activo, Fill solo en indicadores de estado, Duotone para ilustración de estados vacíos (32px+).
Tamaños 16/20/24/32 — 24 default en móvil, 20 en filas densas. Icon button 44×44 aunque el glifo mida 24.

**El icono —no el color— es el identificador primario de cada categoría.**

## 7. Botones

Altura 48 (default móvil), 40 (sm), 56 (acción principal de onboarding). Radio 12; full en pill y voz.
**Una sola acción primaria visible por pantalla.** La acción de voz es el único control donde aparece el gradiente.

## 8. Inputs

Altura 48, radio 12, borde 1px. Foco: anillo de tinta 2px con offset 3px. El error añade icono y texto, nunca solo color.

## 9. Componentes conversacionales

El usuario habla en **burbuja**; Suma responde en **texto libre sobre el fondo**, firmado con la marca ✚. Los datos financieros se anidan dentro de la respuesta sin competir.

## 10. Sistema de voz — diez estados

Cada estado con forma, movimiento y **texto visible**. Secuencia canónica: Te escucho → Entendiendo → Guardando → Guardado, resuelta en menos de 2s percibidos. Toda pantalla de voz ofrece "Cancelar" y "Escribirlo".

1. **Listo** — "Toca para hablar". Estático.
2. **Escuchando** — respiración lenta, halo suave.
3. **Grabando** — 4 barras, amplitud contenida.
4. **Procesando** — spinner mínimo, sin porcentaje.
5. **Transcribiendo** — texto parcial en gris; se fija al cerrar.
6. **Interpretando** — "Entendí $120 en Comida", editable.
7. **Guardando** — fila optimista al 60% de opacidad.
8. **Guardado** — check 240ms + "Deshacer" 5s.
9. **Error** — "No te escuché bien", ofrece escribir.
10. **Cancelado** — vuelve a "Listo" sin mensaje de culpa.

## 11. Componentes financieros

Regla fija: **el monto va en tinta primaria**; el color solo aparece en el identificador, acompañado siempre de texto.

## 12. Gráficas

Una gráfica por respuesta, siempre con una frase que la interpreta. Paleta construida para daltonismo (cambia tono **y** luminosidad), verificada para deuteranopía, protanopía, tritanopía y escala de grises.

| Token | Valor | Categoría de ejemplo |
|---|---|---|
| `--chart-1` | `#0B5C41` | Comida |
| `--chart-2` | `#9A5B00` | Transporte |
| `--chart-3` | `#4A2BB5` | Hogar |
| `--chart-4` | `#7FB8DE` | Compras |
| `--chart-5` | `#C4699B` | Ocio |
| `--chart-6` | `#6B7280` | Otros |

Toda serie lleva etiqueta directa, icono o patrón. Las series se distinguen por trazo, no solo por color.

## 13. Transacciones

Fila de **72px**: icono de categoría, comercio + metadatos, monto a la derecha en columna tabular. Ingresos con `+`, gastos con `−`, ambos en tinta. Sin divisorias entre filas del mismo día.

## 14. Superficies

**La tarjeta es la excepción, no la regla.** Usa tarjeta cuando el bloque es accionable como unidad, agrupa datos heterogéneos, o responde con estructura dentro del hilo. Evítala en listas homogéneas (usa filas) y en texto de Suma (va directo sobre el fondo). **Nunca tarjeta dentro de tarjeta.**

## 15. Feedback

Guardado optimista: la fila aparece al instante al 60% de opacidad y se confirma al recibir respuesta. **El error nunca borra lo que el usuario dijo.** Skeleton, nunca spinner de pantalla completa. Toast "Guardado · Deshacer" de 5s que no bloquea escribir.

## 16. Navegación

La conversación es la app. **No hay tab bar de cuatro secciones.** Historial y ajustes viven detrás del header (56px): izquierda historial, centro contexto, derecha nueva conversación. Máximo dos niveles. Volver siempre devuelve al hilo.

## 17. Onboarding

Tres pantallas máximo antes del primer gasto. Los permisos se piden **en el momento en que se usan**, no al inicio.

## 18. Accesibilidad

WCAG 2.2 AA como piso. Contraste texto ≥4.5:1, texto grande/iconos/bordes ≥3:1. Foco: anillo de tinta 2px con offset 3px, nunca `outline:none` sin sustituto. Área táctil mínima 44×44 con 8px de separación. Todo significado con color lleva icono, signo o texto. Roles ARIA en chat (`log`, `status`), estados de voz con `aria-live="polite"`. Toda animación respeta `prefers-reduced-motion`.

## 19. Motion

`instant 120ms` (hover, pressed) · `quick 180ms` (chips, toasts) · `base 240ms` (mensajes, confirmación) · `slow 320ms` (sheets, pantallas).
`ease/out cubic-bezier(.16,1,.3,1)` para entradas · `ease/in-out cubic-bezier(.4,0,.2,1)` para bucles de voz.
Con `prefers-reduced-motion` todo se resuelve en opacidad.

## 20. Estados de componente (matriz obligatoria)

Ningún componente interactivo está completo sin: **default, hover, pressed, focused, selected, disabled, loading, success, error**. Selected = borde de tinta 1.5px + check, nunca solo color de fondo. Loading = spinner 16px dentro del control, ancho fijo. Error = borde `--error` + icono + mensaje debajo, conservando lo escrito.

---
Dark mode se deriva reasignando tokens, sin cambiar componentes.
