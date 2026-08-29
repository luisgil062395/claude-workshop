# SUMA — Sub-proyecto A: Fundación + pipeline de gastos por texto

Fecha: 2026-08-29
Fuente de producto: `SUMA_es.md`
Estado: Aprobado para implementación

## 1. Contexto y alcance

SUMA es una app web para llevar el control de gastos personales, con tres formas de
entrada (voz, texto/chat, foto de recibo) que alimentan un mismo pipeline de extracción
estructurada. El MVP completo (P0 del spec de producto) es demasiado grande para un solo
ciclo de diseño → implementación, así que se descompuso en tres sub-proyectos secuenciales:

- **Sub-proyecto A (este documento)** — Fundación del proyecto, modelo de datos, y el
  pipeline unificado de extracción de gastos construido primero sobre la entrada de
  **texto/chat**. Incluye Dashboard básico e Historial. Es el vertical slice mínimo:
  entrada → extracción IA → validación → revisión → guardado → visible en Dashboard/Historial.
- **Sub-proyecto B** (futuro) — Agrega entrada por voz (Web Speech API) y por foto de
  recibo (Claude con visión), reutilizando el pipeline de extracción de A.
- **Sub-proyecto C** (futuro) — Chat conversacional completo (preguntas, correcciones),
  perfil financiero, metas financieras, insights personalizados, y onboarding.

Este spec cubre **solo el Sub-proyecto A**. Voz, recibos, chat de preguntas/orientación
financiera, perfil financiero, metas y onboarding están explícitamente fuera de alcance
aquí (ver sección 9, Fuera de alcance).

## 2. Decisiones técnicas

| Área | Decisión | Razón |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Server Components para lectura, Server Actions para mutaciones — evita montar una API REST separada para un CRUD simple |
| Base de datos | SQLite vía Prisma ORM | Persistencia real sin infraestructura externa; schema tipado y migraciones simples |
| IA de extracción | Anthropic SDK (`@anthropic-ai/sdk`), tool use / structured output | Fuerza que Claude devuelva JSON con forma exacta, evita parseo de texto libre |
| Validación | Zod | La salida de IA se trata como entrada no confiable (sección 23 del spec de producto); nunca se persiste sin validar |
| Resolución de fechas | `chrono-node` (soporta ES/EN), determinista, servidor | Los cálculos de fecha son un requisito crítico y verificable (sección 9); no se delega la aritmética de fechas al modelo |
| Autenticación | Ninguna — un solo usuario local | Fuera de alcance para el workshop; simplifica el MVP |

## 3. Modelo de datos

```prisma
model Expense {
  id            String   @id @default(cuid())
  amount        Float
  currency      String   @default("MXN")
  description   String
  category      String   // validado en la app contra la lista de ExpenseCategory, no como enum de DB
  date          String   // YYYY-MM-DD — fecha real del gasto
  createdAt     DateTime @default(now())
  inputMethod   String   // "voice" | "text" | "receipt" — solo "text" se usa en este sub-proyecto

  rawInput      String?  // texto original del usuario
  receiptImage  String?  // reservado para sub-proyecto B
  confidence    Float?

  locationName  String?
  latitude      Float?
  longitude     Float?

  tax           Float?
  tip           Float?

  items         ReceiptItem[]
}

model ReceiptItem {
  id          String  @id @default(cuid())
  description String
  quantity    Float?
  amount      Float
  expenseId   String
  expense     Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
}
```

`category` se valida en la capa de aplicación (Zod) contra la lista fija de la sección 10
del spec de producto (`food`, `groceries`, `transportation`, `shopping`, `housing`,
`bills`, `health`, `entertainment`, `travel`, `education`, `personal`, `subscriptions`,
`other`), no como enum de SQLite, para poder extenderla sin migración.

`ReceiptItem` se incluye en el schema desde ya porque forma parte del modelo normalizado
de `Expense` (sección 10 del spec de producto), aunque no se popula hasta el sub-proyecto B.

## 4. Flujo de captura por texto (end-to-end)

```
1. Usuario escribe en el chat: "Ayer gasté 180 pesos en Costco en el súper"
2. Cliente calcula su fecha/hora local ("hoy" de referencia, con zona horaria del navegador)
   y la envía junto con el texto
3. Server Action extractExpense(rawInput, referenceDate):
   a. Llama a Claude con tool use → JSON candidato:
      { amount, currency, description, category, dateExpression, confidence }
   b. Valida la forma con Zod (tipos, campos requeridos)
   c. Resuelve dateExpression → fecha exacta (YYYY-MM-DD) con chrono-node,
      usando referenceDate como ancla
   d. Normaliza la categoría contra la lista conocida; si no matchea,
      category = "other" y se marca como incierta
   e. Devuelve al cliente: { candidate: Expense, uncertainFields: string[] }
4. La UI muestra una tarjeta de revisión ("Entendí: $180 MXN, Costco, Groceries, 28 ago")
   con todos los campos editables; los uncertainFields se resaltan y se pregunta
   explícitamente por ellos
5. El usuario edita si hace falta y confirma
6. Server Action saveExpense(expense) vuelve a validar (nunca confía en que el cliente
   no alteró nada) y persiste en SQLite
7. Revalidación de rutas → el gasto aparece de inmediato en Dashboard e Historial
```

Regla crítica heredada del spec de producto (sección 24): nunca se crea o modifica
silenciosamente un registro cuando hay incertidumbre — el flujo siempre pasa por revisión
del usuario antes de guardar.

## 5. Dashboard e Historial

**Dashboard** (`/`):
- Total gastado esta semana / este mes (suma directa y determinista de `Expense.amount`
  filtrado por fecha — sin cálculos vía IA)
- Gasto por categoría: gráfica de barras + tabla textual equivalente (accesibilidad,
  sección 16 del spec de producto — nunca comunicar información solo con color)
- Gastos más grandes y transacciones recientes (últimos 5-10)
- Estado vacío claro cuando no hay gastos: invita a usar el chat

**Historial** (`/expenses`):
- Lista de todos los gastos: descripción, monto, categoría, fecha, método de entrada
- Búsqueda por texto, filtro por categoría, filtro por rango de fecha, ordenamiento
- Editar (reabre la tarjeta de revisión) y eliminar (con confirmación)

Ambas vistas leen directo de Prisma vía Server Components. La lógica de agregación vive en
un único módulo `lib/metrics.ts` con funciones deterministas (`getTotalForPeriod()`,
`getSpendingByCategory()`, etc.), reutilizable en el sub-proyecto C para el chat de
preguntas sobre gastos.

## 6. Estados de carga y manejo de errores

Siguiendo la sección 22 del spec de producto:

- **Extracción**: estado `Entendiendo...` mientras se llama a Claude. Si la llamada falla
  o Zod rechaza la forma del resultado, se muestra: *"No pude entender ese gasto
  claramente. ¿Puedes reformularlo o ingresar el monto manualmente?"* — el texto que el
  usuario escribió se preserva en el input, nunca se pierde.
- **Guardado**: estado `Guardando...` → `Guardado` con confirmación visible.
- Errores de red/DB se capturan dentro de la Server Action y se devuelven como un
  resultado tipado (`{ ok: false, error: string }`), nunca como una excepción sin manejar
  que rompa la UI.

## 7. Accesibilidad (línea base para este sub-proyecto)

- HTML semántico y orden de lectura lógico en el chat, tarjeta de revisión, Dashboard e
  Historial.
- Navegación completa por teclado; estados de foco visibles.
- Formularios de edición accesibles (labels asociados, mensajes de error anunciados).
- Gráfica de categorías con representación textual equivalente (no depende solo de color).
- Diseño responsivo desde el inicio: layout de una columna en móvil, navegación adaptada;
  no es una compresión del layout de escritorio.

## 8. Testing

- **Unit**: resolución de fechas con chrono-node (casos: "ayer", "hoy", "last friday",
  "20 de agosto"), validación Zod del output de Claude, normalización de categorías,
  funciones de `lib/metrics.ts`.
- **Integration**: Server Actions `extractExpense` / `saveExpense` contra una base SQLite
  de prueba (archivo temporal o in-memory).
- La llamada real a la API de Claude no se testea en CI (no determinista); el cliente
  Anthropic se mockea en tests automatizados, y el flujo completo se valida manualmente en
  el navegador antes de dar por terminado el sub-proyecto.

## 9. Fuera de alcance (se abordan en B y C)

- Entrada por voz (Web Speech API) — sub-proyecto B.
- Entrada por foto de recibo (Claude con visión) — sub-proyecto B.
- Chat conversacional para preguntas y orientación financiera — sub-proyecto C.
- Perfil financiero (ingresos, gastos recurrentes, ahorros) — sub-proyecto C.
- Metas financieras y cálculo de escenarios — sub-proyecto C.
- Insights personalizados — sub-proyecto C.
- Onboarding — sub-proyecto C.
- Autenticación multi-usuario — fuera de alcance del workshop completo.

## 10. Definición de terminado (para este sub-proyecto)

- Un gasto puede registrarse escribiendo texto libre en el chat.
- La IA extrae monto, moneda, descripción, categoría y expresión de fecha.
- La fecha relativa se resuelve de forma determinista a una fecha exacta de calendario.
- La salida de la IA se valida (Zod) antes de mostrarse y antes de guardarse.
- El usuario puede revisar y editar cualquier campo antes de confirmar.
- El gasto persiste en SQLite y aparece de inmediato en Dashboard e Historial.
- Historial soporta búsqueda, filtros, edición y eliminación.
- La app es responsiva (desktop/tablet/móvil) y cumple la línea base de accesibilidad
  descrita en la sección 7.
