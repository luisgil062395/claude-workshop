# WORKSHOP.md — SUMA en 3–4 horas

Guion operativo para construir y demostrar SUMA en un workshop/hackathon de 3–4 horas usando Claude Code. Las reglas de implementación viven en [CLAUDE.md](CLAUDE.md); el producto, en [SUMA_es.md](SUMA_es.md).

**Principio rector:** cada bloque termina con la app funcionando de punta a punta (vertical slices, spec §26). Si un bloque se atrasa, se recorta el *siguiente*; nunca se deja un bloque a medias. La demo final debe poder darse al terminar cualquier bloque a partir del segundo.

## Arco de tiempo (3.5 h nominales)

| Bloque | Tiempo | Qué se construye | Demostrable al terminar |
|---|---|---|---|
| 0. Setup | 0:00–0:20 | Scaffold Vite + React + TS, `.env.local` con API key, tipos del spec §10, store con `localStorage`, **seed data (modo demo)** | La app corre y el dashboard se ve vivo con datos sintéticos |
| 1. Slice vertical de texto | 0:20–1:10 | Input de texto → extracción con Claude → tarjeta de revisión → guardar → historial | "Ayer gasté 250 en Soriana" se convierte en un gasto guardado |
| 2. Dashboard + métricas | 1:10–1:50 | Totales por categoría y periodo **calculados en código** (deterministas), gráfica con equivalente de texto | El gasto recién guardado mueve las métricas |
| 3. Voz | 1:50–2:20 | Web Speech API alimentando el mismo pipeline del bloque 1 | El mismo flujo, hablado |
| 4. Recibo | 2:20–2:50 | Foto → Claude vision → mismo pipeline, con `confidence` por campo | Foto de recibo → gasto revisable |
| 5. Chat + pulido | 2:50–3:20 | Chat que responde sobre los datos vía tools deterministas; estados vacío/carga/error | "¿Cuánto llevo en súper este mes?" con número exacto |
| 6. Demo final | 3:20–3:30 | Nada nuevo — solo el guion de abajo | — |

Con 4 horas: el margen extra va a los bloques 4 y 5, o a las ideas 7–8 de la lista de diferenciadores.

## Guion de demo (~7 min)

Basado en los escenarios del spec §28–30, que ya traen los outputs esperados (sirven para verificar en vivo).

1. **Texto + fecha relativa** — Escribir: *"Ayer gasté 250 pesos en Soriana en el súper."* Señalar en la tarjeta de revisión que `date` es la fecha de **ayer** exacta (no hoy) y que `createdAt` es ahora. Confirmar → aparece en historial y mueve el dashboard. (Spec §28: `{amount: 250, currency: "MXN", category: "groceries", ...}`.)
2. **Voz** — Decir la misma frase u otra al micrófono. Punto a narrar: es *el mismo pipeline*; la voz solo es otro adaptador de entrada.
3. **Incertidumbre** — Input deliberadamente ambiguo: *"gasté como 200 o 250 en algo del súper"*. La app **no adivina**: resalta los campos dudosos y pregunta (spec §24).
4. **Recibo desde el teléfono** — Con `npm run dev -- --host` y un QR en pantalla, abrir la app en el celular y fotografiar un recibo real. Claude vision lo extrae → misma tarjeta de revisión (spec §29).
5. **Chat determinista** — Preguntar: *"¿Cuánto llevo en súper este mes?"* y *"¿Cuánto tardaría en ahorrar $50,000?"*. Narrar que Claude llama funciones del código (`sum_by_category`, `project_savings`) y solo redacta la respuesta con los supuestos visibles — nunca hace la aritmética (spec §30: $5,000/mes disponibles → ~6 meses).
6. **Cierre de accesibilidad** — Repetir el flujo de texto completo **solo con teclado** y mostrar el equivalente de texto de la gráfica.

## Ideas out-of-the-box para destacar

Ordenadas por impacto/esfuerzo. Las primeras cuatro son parte del arco; las demás son opcionales si sobra tiempo.

1. **Fechas relativas en vivo** — "antier", "el viernes pasado", "hace dos semanas" resueltas a fecha exacta contra la zona horaria local. Es el requisito crítico del spec (§9), es verificable al instante por el público, y casi ninguna demo de gastos lo hace bien. Pasarle al modelo la fecha local actual en el prompt y validar el resultado en código.
2. **UI de incertidumbre** — la extracción devuelve `confidence` por campo; los campos dudosos se resaltan (con ícono + texto, no solo color) y la app *pregunta* en vez de adivinar. Convierte la regla §24 en teatro de demo: la audiencia ve a la IA decir "no estoy segura".
3. **"Un pipeline, tres entradas"** — una vista (o momento de demo) que muestra lado a lado el mismo JSON producido por voz, texto y recibo. Comunica la arquitectura completa en una pantalla.
4. **Chat con herramientas deterministas** — Claude no hace aritmética: llama tools implementadas en código y narra el resultado mostrando supuestos. Diferenciador técnico real frente a "chatbot que alucina números", y es exactamente lo que exige el spec (§30, §32.8).
5. **Demo desde el teléfono** — `npm run dev -- --host` + QR del URL LAN en la pantalla. La foto del recibo se toma en vivo con la cámara del celular y de paso demuestra el layout responsivo.
6. **Modo demo con seed data** — botón o flag que puebla ~3 semanas de gastos sintéticos para que dashboard, métricas e insights se vean vivos desde el minuto 1. El spec ya exige mock data separado de la lógica (§32.9), así que sale casi gratis.
7. **Flex de accesibilidad** — cerrar la demo recorriendo el flujo solo con teclado y mostrando el equivalente textual de la gráfica. En un hackathon nadie más lo enseña, y aquí es requisito de arquitectura (§21).
8. **Multi-moneda** — *"gasté 50 dólares en Amazon"* → `currency: "USD"` detectada. Una línea en el prompt de extracción, un momento de demo.

## Plan B (la demo nunca muere)

- **Micrófono o WiFi fallan** → todas las frases de voz del guion están arriba como texto; se pegan en el input de texto y el pipeline es el mismo.
- **La foto en vivo falla** → tener una imagen de recibo de respaldo commiteada en `demo-assets/` y un botón/ruta para subir archivo además de la cámara.
- **API key agotada o rate limit** → el modo demo (seed data) mantiene dashboard, historial, métricas y las respuestas del chat determinista demostrables sin ninguna llamada nueva al API.
- **Un bloque se atrasa** → recortar el siguiente bloque, no el actual; la demo funciona desde el final del bloque 1.

## Checklist previo al día del workshop

- [ ] Node 20+ instalado en la máquina de demo.
- [ ] API key de Anthropic con crédito, probada en `.env.local`.
- [ ] Chrome/Edge para la demo (Web Speech API tiene mejor soporte ahí).
- [ ] Teléfono y laptop en la misma red WiFi (para el QR); hotspot como respaldo.
- [ ] Recibo físico real a la mano + imagen de respaldo en `demo-assets/`.
- [ ] Micrófono probado en el navegador (permiso ya otorgado).
