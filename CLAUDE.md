# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este repo

**SUMA** — web app responsiva de registro de gastos personales con tres entradas (voz, texto/chat, foto de recibo) que convergen en **un solo pipeline de extracción con IA**: `extract → validate → review → save`.

- [SUMA_es.md](SUMA_es.md) es el **spec de producto de referencia** (~1,233 líneas). Este CLAUDE.md no lo duplica: cita secciones (§N) de ese archivo. Ante conflicto, el spec manda en producto; este archivo manda en stack y operación.
- Ojo: el spec se autodenomina "CLAUDE.md" en su primera línea y contiene artefactos de traducción automática ("Editarar", "Requerido monthly savings", un token `fileciteturn...` suelto). No copiar esos textos a la UI ni al código.
- [WORKSHOP.md](WORKSHOP.md) contiene el arco del workshop de 3–4 h y el guion de demo.
- El alcance es **P0 del §26** del spec. No implementar nada de P2 (integraciones bancarias, presupuestos avanzados, multi-cuenta...).

## Stack y comandos

Stack fijado: **Vite + React + TypeScript, sin backend**. Persistencia en `localStorage`. Voz con **Web Speech API** del navegador (sin API keys). Extracción de texto y visión de recibos con **Claude API llamado directamente desde el browser**.

El código aún no existe. Comandos previstos una vez hecho el scaffold:

```sh
npm create vite@latest . -- --template react-ts   # scaffold inicial (una sola vez)
npm install @anthropic-ai/sdk
npm run dev                # servidor de desarrollo
npm run dev -- --host      # dev server accesible en LAN (demo desde el teléfono)
npm run build              # build de producción (incluye tsc)
npm run lint               # ESLint
npx vitest                 # tests en modo watch
npx vitest run src/lib/dates.test.ts   # un solo archivo de test
```

### Claude API desde el browser

- API key en `.env.local` como `VITE_ANTHROPIC_API_KEY`. `.env.local` va en `.gitignore`; **nunca** commitearla. (Esto es aceptable solo porque es una demo de workshop donde cada quien usa su propia key; no es patrón de producción.)
- Cliente: `new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true })` (equivale al header `anthropic-dangerous-direct-browser-access: true`).
- Modelo por defecto: `claude-sonnet-5` (decisión deliberada del equipo por costo/latencia en un workshop; el mismo modelo cubre extracción de texto y visión de recibos).
- Recibos: bloque `{ type: "image", source: { type: "base64", media_type, data } }` en el mensaje de usuario, antes del bloque de texto.
- Extracción estructurada: preferir tool use con `strict: true` o `output_config.format` sobre "devuélveme JSON" en el prompt. Al escribir este código, consultar la skill `claude-api` para los parámetros vigentes.

## Arquitectura prevista

(Del spec §7, §27 y §32.)

- **Un solo pipeline compartido** para voz, texto y recibo — nunca tres sistemas de gastos separados (§7). Voz y recibo solo son adaptadores de entrada que producen texto/imagen para el mismo extractor.
- **Una sola fuente de verdad** de gastos (store + `localStorage`); dashboard, historial, métricas, chat e insights leen de ahí (§32.4).
- **Extracción de IA separada de la presentación** (§32.6): la capa de API vive en `src/lib/`, los componentes solo consumen resultados tipados.
- **Datos mock/seed separados de la lógica** (§32.9): el modo demo puebla el store, no ramifica el código de la app.
- Modelo de datos: usar los tipos del **§10 tal cual** (`Expense`, `ReceiptItem`, `ExpenseCategory` de 13 valores) — no reinventarlos ni renombrarles campos. Metas: `FinancialGoal` (§14).

## Invariantes no negociables

1. **La salida del modelo es input no confiable.** Validar siempre contra el esquema antes de persistir; la salida cruda del LLM nunca modifica registros financieros directamente (§23).
2. **Nunca crear o modificar silenciosamente un registro financiero cuando la IA está incierta** — preguntar al usuario (§24). Todo gasto pasa por review/edit antes de guardarse.
3. **`date` ≠ `createdAt`** (§9). `date` es la fecha del gasto (YYYY-MM-DD); `createdAt` es cuándo se registró (ISO). Las fechas relativas ("ayer", "el viernes pasado") se resuelven contra la fecha/zona horaria local del usuario; nunca sobreescribir la fecha del gasto con la fecha de captura.
4. **Nunca inventar campos de un recibo** (§6): si un campo no se lee, mostrar "desconocido" o preguntar.
5. **Toda matemática financiera es determinista**: se calcula en código sobre los datos guardados; el LLM narra y contextualiza, no calcula (§30, §32.8). En chat, los números salen de funciones propias (tools), no del modelo.
6. **Accesibilidad WCAG 2.2 AA desde el inicio** (§21): la voz nunca es el único camino a una tarea (§4.1), toda gráfica tiene equivalente de texto, nada se comunica solo por color.
7. Todo componente tiene estados de **carga, vacío, éxito y error**, y los errores preservan el input del usuario (§32.11–12).
8. Tono calmado y sin juicios; distinguir hechos, cálculos, supuestos y sugerencias (§13). SUMA no es asesor financiero regulado.

## Definición de terminado

Ver §31 del spec: un gasto está bien capturado cuando fue extraído, validado, revisado por el usuario, persistido, y aparece en historial, métricas, chat e insights. Ante ambigüedad, hacer la suposición razonable más pequeña y documentarla (§32.18).
