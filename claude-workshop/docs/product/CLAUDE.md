# CLAUDE.md --- SUMA

## 1. Contexto del producto

**SUMA** es una aplicación web responsiva para llevar el control de los gastos personales de forma sencilla.

La idea central:

> **Understanding your money should be as easy as telling SUMA what you
> spent.**

SUMA permite registrar gastos mediante tres formas de entrada complementarias:

1.  **Voz** --- habla de forma natural sobre una compra.
2.  **Chat / texto** --- escribe un gasto o haz preguntas financieras de forma conversacional.
3.  **Receipt photos** --- upload or capture a receipt so AI can extract
    the expense information.

La aplicación convierte estas entradas en datos financieros estructurados que alimentan el historial, las métricas, las tendencias, los insights personalizados y la orientación financiera del usuario.

El producto debe sentirse tranquilo, cercano, inteligente, accesible y sin juicios.

The experience is **web-first and fully responsive**, adapting from
desktop to tablet and mobile. It should feel like a coherent product
across screen sizes, not a desktop UI simply compressed onto a phone.

------------------------------------------------------------------------

# 2. Product vision

SUMA ayuda a las personas a desarrollar conciencia financiera sin exigirles convertirse en expertas en presupuestos.

Muchas personas quieren saber:

-   ¿A dónde se está yendo mi dinero?
-   ¿Estoy gastando más de lo habitual?
-   ¿Puedo permitirme algo?
-   ¿Cuánto puedo ahorrar de forma realista?
-   ¿Qué podría cambiar para alcanzar una meta?
-   ¿Qué gastos están afectando mi capacidad de ahorrar?

SUMA debe responder estas preguntas combinando:

**Control de gastos + comprensión mediante IA + contexto financiero + orientación personalizada.**

La aplicación debe centrarse en la situación y las posibilidades financieras reales del usuario.

Ejemplo:

> "Quiero comprar un auto."

SUMA debe considerar la información financiera disponible del usuario, como ingresos, gastos recurrentes, gastos actuales, ahorros, deudas y metas declaradas, y explicar qué opciones parecen realistas.

Debe evitar consejos genéricos que ignoren las circunstancias del usuario.

------------------------------------------------------------------------

# 3. Primary product goals

### Objetivo 1 --- Hacer que registrar gastos sea sencillo

El usuario debe poder registrar un gasto en segundos al decirlo, escribirlo o fotografiarlo.

### Objetivo 2 --- Convertir entradas no estructuradas en datos estructurados

La IA debe identificar la información importante a partir del lenguaje natural o de los recibos.

### Objetivo 3 --- Hacer transparente la interpretación de la IA

Los usuarios siempre deben poder ver lo que SUMA entendió y corregirlo.

### Objetivo 4 --- Convertir datos en comprensión

Las métricas, el historial, las tendencias y los insights deben ayudar a los usuarios a comprender sus patrones de gasto.

### Objetivo 5 --- Proporcionar orientación financiera personalizada

SUMA puede ayudar a los usuarios a evaluar decisiones de gasto y metas utilizando su propio contexto financiero.

### Objetivo 6 --- Hacer accesible el control financiero

El producto debe ser compatible con personas con distintas capacidades físicas, sensoriales, cognitivas y tecnológicas.

### Objetivo 7 --- Mantener una experiencia ligera

Los usuarios deben poder utilizar SUMA de manera casual sin tener que mantener un presupuesto complejo.

------------------------------------------------------------------------

# 4. Core experience

## 4.1 Registro de gastos por voz

La voz es una de las principales formas de crear un gasto.

Ejemplo:

> "Ayer gasté 180 pesos en Costco en el súper."

SUMA debe extraer:

-   Monto: `180`
-   Moneda: `MXN`
-   Descripción: `Costco`
-   Categoría: `Groceries`
-   Fecha: fecha exacta correspondiente a "ayer"
-   Método de entrada: `voice`

Flujo:

1.  El usuario activa la entrada por voz.
2.  SUMA indica que está escuchando.
3.  El usuario habla de forma natural.
4.  Se transcribe el habla.
5.  La IA extrae la información estructurada.
6.  Se resuelven las fechas relativas.
7.  Se infiere la categoría.
8.  SUMA presenta lo que entendió.
9.  El usuario puede editar cualquier campo.
10. El usuario confirma.
11. Se guarda el gasto.
12. SUMA confirma la transacción guardada.

### Importante

La voz nunca debe ser la única forma de completar la tarea.

Toda interacción por voz necesita una alternativa de texto accesible.

------------------------------------------------------------------------

# 5. Chat and text input

El chat es una experiencia de producto de primera clase.

Los usuarios pueden:

### Registrar gastos

> "Pagué $80 por la comida."

### Corregir gastos

> "En realidad, eso fue ayer."

### Hacer preguntas

> "¿Cuánto gasté esta semana?"

> "¿En qué gasté más?"

> "¿Cuánto gasté en restaurantes este mes?"

> "¿Cuánto he gastado en café?"

### Pedir orientación financiera

> "¿Puedo permitirme un viaje de $15,000?"

> "Quiero comprar un auto. ¿Cuál sería un pago mensual realista para mí?"

> "¿Cuánto podría ahorrar cada mes?"

> "¿En qué podría reducir mis gastos?"

El asistente debe utilizar los datos financieros disponibles del usuario y explicar claramente sus supuestos.

------------------------------------------------------------------------

# 6. Receipt photo capture

Los usuarios pueden agregar un gasto subiendo o tomando una foto de un recibo.

Flujo compatible:

1.  El usuario selecciona o toma una foto del recibo.
2.  SUMA procesa la imagen con OCR / IA.
3.  La IA identifica la información relevante.
4.  SUMA presenta los campos extraídos.
5.  El usuario revisa y edita.
6.  El usuario confirma.
7.  Se guarda el gasto.

### Información del recibo que se debe extraer cuando esté disponible

-   Comercio
-   Monto total
-   Moneda
-   Fecha
-   Hora
-   Artículos individuales
-   Categoría
-   Impuesto
-   Propina
-   Método de pago, cuando sea visible
-   Ubicación, cuando sea visible

No todos los recibos contienen todos los campos.

La aplicación nunca debe inventar información que falte en un recibo.

Si un campo no puede extraerse de forma confiable, debe mostrarse como desconocido o preguntarse al usuario.

### Ejemplo

Receipt:

> COSTCO\
> Groceries --- \$450.00\
> Tax --- \$72.00\
> Total --- \$522.00\
> Aug 28, 2026

Datos estructurados esperados:

``` json
{
  "amount": 522,
  "currency": "MXN",
  "description": "Costco",
  "category": "Groceries",
  "date": "2026-08-28",
  "inputMethod": "receipt"
}
```

------------------------------------------------------------------------

# 7. Unified expense extraction

La voz, el chat y las fotos de recibos deben alimentar el mismo pipeline de creación de gastos.

``` text
Voice ───────┐
             │
Text/Chat ───┼──> AI extraction ──> Validation ──> Review ──> Save
             │
Receipt ─────┘
```

La aplicación debe evitar crear tres sistemas de gastos separados.

Todas las entradas deben producir la misma estructura normalizada de `Expense`.

------------------------------------------------------------------------

# 8. Requerido expense fields

Todo gasto guardado debe admitir:

  Field            Requerido   Descripción
  ---------------- ---------- ---------------------------------------
  `amount`         Yes        Monto numérico
  `currency`       Yes        Código de moneda ISO
  `description`    Yes        Comercio, artículo o propósito
  `category`       Yes        Categoría de gasto normalizada
  `date`           Yes        Fecha exacta del calendario
  `createdAt`      Yes        Marca de tiempo en que se creó el registro
  `inputMethod`    Yes        `voice`, `text`, or `receipt`
  `rawInput`       Optional   Transcripción/texto original
  `receiptImage`   Optional   Referencia de la imagen del recibo
  `confidence`     Optional   Confianza de extracción de la IA
  `location`       Optional   Ubicación si está disponible y permitida
  `items`          Optional   Artículos del recibo
  `tax`            Optional   Impuesto extraído
  `tip`            Optional   Propina extraída

------------------------------------------------------------------------

# 9. Manejo de fechas

La extracción de fechas es un requisito crítico.

SUMA debe comprender expresiones de fecha naturales como:

-   today
-   yesterday
-   tomorrow
-   this morning
-   last Friday
-   two days ago
-   last weekend
-   August 20
-   August 20th
-   on Monday

Las fechas relativas deben resolverse según la fecha local y la zona horaria del usuario.

Ejemplo:

> "I spent \$20 yesterday."

The application must save the exact calendar date corresponding to
yesterday.

### Importante distinction

Lo siguiente es diferente:

-   `createdAt` --- cuándo registró el usuario el gasto.
-   `date` --- cuándo ocurrió realmente el gasto.

Un usuario puede registrar hoy un gasto de ayer.

Nunca sobrescribas la fecha del gasto con la fecha de registro cuando el usuario especifique una fecha diferente.

------------------------------------------------------------------------

# 10. Modelo de datos de gastos

Use a normalized model similar to:

``` ts
type ExpenseInputMethod = "voice" | "text" | "receipt";

type Expense = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  inputMethod: ExpenseInputMethod;

  rawInput?: string;
  receiptImage?: string;
  confidence?: number;

  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };

  items?: ReceiptItem[];
  tax?: number;
  tip?: number;
};

type ReceiptItem = {
  description: string;
  quantity?: number;
  amount: number;
};

type ExpenseCategory =
  | "food"
  | "groceries"
  | "transportation"
  | "shopping"
  | "housing"
  | "bills"
  | "health"
  | "entertainment"
  | "travel"
  | "education"
  | "personal"
  | "subscriptions"
  | "other";
```

Las categorías deben seguir siendo extensibles.

------------------------------------------------------------------------

# 11. Revisión y confirmación

Los gastos generados por IA deben poder revisarse.

Ejemplo:

``` text
Entendí:

$180 MXN
Costco
Groceries
August 28

[ Editarar ]       [ Guardar ]
```

Cada campo extraído debe poder editarse.

Para extracciones con menor confianza:

``` text
Creo que esto es:

$180 MXN
Costco
Groceries
August 28

¿Es correcto?
```

Cuando la información sea ambigua, haz una pregunta.

Ejemplo:

> "I found a \$180 charge at Costco, but I couldn't determine the
> category. What should I categorize it as?"

### Principio fundamental

**El usuario mantiene el control de sus registros financieros.**

La IA ayuda con la interpretación; no toma silenciosamente decisiones financieras inciertas.

------------------------------------------------------------------------

# 12. Perfil financiero

Para proporcionar orientación personalizada útil, SUMA puede conocer de forma opcional el contexto financiero del usuario.

Información posible:

-   Ingresos mensuales
-   Frecuencia de ingresos
-   Gastos mensuales fijos
-   Gastos variables
-   Ahorros existentes
-   Pagos de deudas
-   Metas financieras
-   Monto de ahorro deseado
-   Próximos gastos importantes
-   Personas a cargo / contexto del hogar, si el usuario decide proporcionarlo

Esta información debe ser opcional y editable.

El usuario debe poder comenzar a registrar gastos sin completar un cuestionario financiero extenso.

------------------------------------------------------------------------

# 13. Orientación financiera personalizada

SUMA puede proporcionar orientación financiera basada en el contexto financiero real del usuario.

The guidance should consider:

-   Income
-   Recurring expenses
-   Spending patterns
-   Savings
-   Debt
-   Metas financieras
-   Hora horizon
-   Ingreso disponible

Ejemplo:

User:

> "Quiero comprar un auto."

SUMA:

> "Según los ingresos y gastos que has compartido, actualmente tienes
> about \$350 disponibles cada mes después de los gastos recurrentes. Ahorrar
> \$350/month would give you aproximadamente \$4,200 in 12 months. If
> you'd like, I can compare a few savings scenarios."

The assistant can show scenarios such as:

-   Conservative
-   Balanced
-   Faster goal

### Principios de orientación financiera

La orientación debe ser:

-   Personalizada.
-   Explicable.
-   Basada en los datos disponibles.
-   Transparente respecto a los supuestos.
-   Basada en escenarios.
-   Sin juicios.
-   Conservadora cuando la información es incompleta.

SUMA should distinguish clearly between:

**Hechos**

> "You spent \$1,240 on dining last month."

**Cálculos**

> "At your current average, you could save aproximadamente \$300/month."

**Sugerencias**

> "Reducing dining by 15% could free aproximadamente \$186/month."

**Incertidumbre**

> "This estimate doesn't include your annual insurance payment because
> you haven't added it."

No presentes las proyecciones financieras como garantías.

SUMA es un asistente de conciencia y planificación financiera, no un asesor financiero regulado.

------------------------------------------------------------------------

# 14. Metas financieras

Los usuarios pueden crear opcionalmente metas como:

-   Fondo de emergencia
-   Auto
-   Vacaciones
-   Hogar
-   Pago de deudas
-   Meta de ahorro
-   Compra importante

Cada meta puede contener:

``` ts
type FinancialGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
};
```

The assistant can calculate:

-   Requerido monthly savings
-   Tiempo estimado para alcanzar la meta
-   Progreso actual
-   Comparaciones de escenarios
-   Cambios en el gasto que podrían acelerar la meta

------------------------------------------------------------------------

# 15. Dashboard

El dashboard debe responder:

> **¿Cómo voy con mi dinero?**

Core information:

-   Total gastado esta semana
-   Total gastado este mes
-   Monto disponible restante, cuando existan datos suficientes
-   Gasto por categoría
-   Tendencia de gasto
-   Gastos más grandes
-   Transacciones recientes
-   Insights personalizados
-   Progreso de metas

El dashboard debe priorizar información útil sobre densidad visual.

------------------------------------------------------------------------

# 16. Métricas

Proporciona una sección dedicada de métricas/analítica.

### Time filters

-   Esta semana
-   Este mes
-   Mes pasado
-   Este año
-   Rango personalizado

### Metrics

-   Gasto total
-   Gasto diario promedio
-   Gasto por categoría
-   Tendencia de gasto
-   Categoría changes
-   Gastos más grandes
-   Comercios más frecuentes
-   Gastos recurrentes
-   Comparación con el periodo anterior

### Charts

Utiliza visualizaciones accesibles:

-   Gráficas de barras
-   Gráficas de líneas
-   Indicadores de progreso
-   Categoría breakdowns

Cada gráfica debe tener una representación textual equivalente.

Ejemplo:

``` text
Food & Dining — $320 — 32%
Transportation — $180 — 18%
Shopping — $150 — 15%
```

Nunca comuniques información importante únicamente mediante el color.

------------------------------------------------------------------------

# 17. Insights personalizados

Los insights deben generarse a partir de datos reales de gastos.

Examples:

> "You spent \$52 more on dining this week than last week."

> "Transportation represents 18% of your spending this month."

> "You spent \$35 on coffee across 5 transactions."

> "Your grocery spending is 12% lower than last month."

Los insights deben ser:

-   Específicos.
-   Respaldados por datos.
-   Explicable.
-   Útiles.
-   Sin juicios.
-   Descartables.

Evita mensajes que generen culpa, como:

> "Estás gastando demasiado."

Prefiere:

> "Dining is currently your largest variable category. You spent \$240
> more this month than last month."

------------------------------------------------------------------------

# 18. Historial

Los usuarios necesitan una vista completa de los gastos registrados.

Each transaction should display:

-   Descripción
-   Amount
-   Categoría
-   Fecha
-   Método de entrada
-   Indicador de recibo cuando corresponda

Admite:

-   Búsqueda
-   Categoría filtering
-   Fecha filtering
-   Filtrado por monto
-   Ordenamiento
-   Editar
-   Eliminar
-   Ver detalles
-   Vista previa del recibo

El historial debe facilitar la identificación y corrección de errores de la IA.

------------------------------------------------------------------------

# 19. Onboarding

El onboarding debe ser breve, opcional y fácil de omitir.

The current design direction communicates:

1.  Expense tracking doesn't need to be complicated.
2.  Users can speak naturally.
3.  SUMA handles the organization.
4.  Users can choose a starting context.
5.  Permissions are requested when they provide value.
    fileciteturn1file3L19-L24

### Onboarding sugerido

#### Screen 1

**Controla tus gastos sin estrés.**

"Habla, escribe o toma una foto de un recibo. Nosotros lo organizamos por ti."

#### Screen 2

**Solo dile a SUMA en qué gastaste.**

> "Spent about \$30 on groceries."

#### Screen 3

**Ve el panorama completo.**

Presenta métricas, tendencias e insights.

#### Screen 4

**Elige tu punto de partida**

Optional profiles:

-   Esenciales
-   Estudiante
-   Family & Hogar
-   Freelancer y profesional
-   Todas las categorías

#### Screen 5

**Haz que SUMA trabaje para ti.**

Permisos opcionales:

-   Micrófono
-   Cámara
-   Ubicación

Los permisos deben explicarse con lenguaje sencillo.

La aplicación debe seguir siendo utilizable si los usuarios rechazan permisos opcionales.

------------------------------------------------------------------------

# 20. Requisitos de web responsiva

SUMA es una **aplicación web**.

It must work well on:

-   Desktop
-   Laptop
-   Tablet
-   Mobile browser

### Principios responsivos

Desktop puede utilizar:

-   Sidebar navigation
-   Multi-column dashboard
-   Expanded metrics
-   Persistent chat panel when useful

Móvil puede utilizar:

-   Compact navigation
-   Bottom navigation when appropriate
-   Single-column content
-   Full-screen voice interaction
-   Bottom-sheet editing
-   Responsive charts

No te limites a reducir el tamaño de los componentes de desktop.

Las interacciones deben adaptarse al dispositivo del usuario y al espacio disponible.

La voz, el chat, la carga de recibos, el historial, las métricas y el onboarding deben
seguir funcionando en todos los breakpoints.

------------------------------------------------------------------------

# 21. Accesibilidad

Target:

**WCAG 2.2 AA**

La accesibilidad es un requisito arquitectónico fundamental.

Admite:

-   Screen readers
-   Keyboard navigation
-   VoiceOver
-   Dynamic text sizing
-   High contrast
-   Reduced motion
-   Clear focus states
-   Semantic HTML
-   Logical reading order
-   Accessible forms
-   Accessible charts
-   Accessible error states
-   Accessible dialogs
-   Accessible drag/drop alternatives

### Accesibilidad motriz

-   Large touch/click targets.
-   Avoid requiring precise gestures.
-   Provide keyboard alternatives.
-   Avoid time-sensitive interactions.
-   Make voice, text, and upload paths available.

### Accesibilidad visual

-   Do not rely on color alone.
-   Maintain strong contrast.
-   Provide text equivalents for charts.
-   Use descriptive labels.
-   Support zoom and text resizing.

### Accesibilidad cognitiva

Utiliza:

-   Plain language.
-   Consistent terminology.
-   Predictable navigation.
-   Short instructions.
-   Clear confirmation.
-   Clear error recovery.
-   One primary action per screen when possible.

### Accesibilidad de voz

La voz debe complementarse con:

-   Text input.
-   Editarable transcription.
-   Keyboard navigation.
-   Screen-reader-compatible feedback.

Un usuario nunca debe quedar bloqueado por no poder utilizar un micrófono.

------------------------------------------------------------------------

# 22. Estados de feedback

El sistema debe comunicar claramente qué está sucediendo.

### Voz

``` text
Listo
↓
Escuchando...
↓
Transcribiendo...
↓
Entendiendo...
↓
Revisión
↓
Guardando...
↓
Guardado
```

### Recibo

``` text
Subiendo...
↓
Leyendo el recibo...
↓
Extrayendo detalles...
↓
Revisión
↓
Guardado
```

### Errores

Examples:

> "I couldn't read the receipt clearly. Try another photo or enter the
> total manually."

> "I couldn't hear that clearly. You can try again or type the expense."

Evita indicadores de carga vagos sin explicación.

------------------------------------------------------------------------

# 23. Confianza y validación de la IA

La salida de la IA debe tratarse como una entrada no confiable.

El sistema debe:

1.  Receive AI output.
2.  Validate the structure.
3.  Validate required fields.
4.  Check numeric values.
5.  Normalize categories.
6.  Resolve dates.
7.  Flag uncertain fields.
8.  Present the result to the user.
9.  Save only validated data.

Nunca permitas que la salida sin procesar del modelo modifique directamente los registros financieros.

------------------------------------------------------------------------

# 24. Reglas de comportamiento de la IA

El asistente debe:

-   Extract structured data from natural language.
-   Extract data from receipt images.
-   Ask for missing required information.
-   Maintain conversation context.
-   Correct existing expenses.
-   Answer questions using recorded data.
-   Calculate metrics from the underlying expense records.
-   Provide personalized scenarios using the user's financial profile.
-   Explain assumptions.
-   Acknowledge uncertainty.
-   Avoid hallucinating transactions.
-   Avoid inventing receipt information.

### Regla crítica

**Never silently create or modify a financial record when the AI is
uncertain.**

Cuando haya incertidumbre, pregunta.

------------------------------------------------------------------------

# 25. Privacidad y confianza

La información financiera y las imágenes de recibos pueden contener
información sensible.

La aplicación debe:

-   Minimize stored personal data.
-   Request permissions only when needed.
-   Clearly explain why permissions are requested.
-   Allow users to delete expenses.
-   Allow users to delete receipt images.
-   Avoid unnecessary retention of voice recordings.
-   Avoid unnecessary location collection.
-   Clearly communicate how AI processing works.
-   Never expose financial information unnecessarily.

Si el audio solo se necesita para la transcripción, no debe conservarse de forma predeterminada
a menos que exista un requisito de producto documentado.

------------------------------------------------------------------------

# 26. Alcance del MVP para el workshop de Claude Code

Prioriza un vertical slice funcional.

## P0 --- Requerido

### Registro de gastos

-   Voice input
-   Text/chat input
-   Receipt photo upload
-   AI extraction
-   Amount extraction
-   Moneda extraction
-   Descripción extraction
-   Categoría extraction
-   Fecha extraction
-   Relative date resolution
-   Review/edit before save
-   Expense persistence

### Producto principal

-   Expense history
-   Dashboard
-   Basic metrics
-   Chat
-   Basic personalized insights
-   Responsive web layout
-   Accessible text alternatives
-   Simple onboarding

### Contexto financiero

-   Basic income input
-   Basic recurring expense input
-   Optional savings goal
-   Personalized calculations

------------------------------------------------------------------------

## P1 --- Valioso

-   Advanced receipt extraction
-   Artículos del recibo
-   Ubicación tagging
-   Categoría customization
-   Period comparisons
-   Advanced charts
-   Voice corrections
-   Financial goal scenarios
-   More personalized insights

------------------------------------------------------------------------

## P2 --- Futuro

-   Bank integrations
-   Automatic transaction imports
-   Shared household finances
-   Recurring expense detection
-   Advanced budgeting
-   Investment tracking
-   Multi-account support
-   Impuesto categorization

No amplíes a P2 hasta que la experiencia central voz/texto/recibo → gasto estructurado
→ métricas sea estable.

------------------------------------------------------------------------

# 27. Estructura sugerida de la aplicación

Una posible arquitectura de información:

``` text
SUMA
│
├── Dashboard
│   ├── Spending summary
│   ├── Recent expenses
│   ├── Insights
│   └── Goals
│
├── Add expense
│   ├── Voice
│   ├── Text
│   └── Receipt
│
├── Expenses
│   ├── History
│   ├── Búsqueda
│   └── Filters
│
├── Insights
│   ├── Trends
│   ├── Categories
│   └── Comparisons
│
├── Chat
│   └── Financial assistant
│
└── Settings
    ├── Financial profile
    ├── Categories
    ├── Goals
    ├── Permissions
    └── Privacy
```

La navegación exacta puede evolucionar con el diseño responsivo.

------------------------------------------------------------------------

# 28. Ejemplo de escenario de extremo a extremo

### Escenario: Voz

El usuario dice:

> "Yesterday I spent 250 pesos at Soriana on groceries."

SUMA extrae:

``` json
{
  "amount": 250,
  "currency": "MXN",
  "description": "Soriana",
  "category": "groceries",
  "date": "2026-08-28",
  "inputMethod": "voice"
}
```

SUMA muestra:

> **\$250 MXN**\
> Soriana\
> Groceries\
> Aug 28, 2026

El usuario confirma.

El gasto se guarda y queda disponible inmediatamente en:

-   Dashboard
-   History
-   Metrics
-   Insights
-   Chat

------------------------------------------------------------------------

# 29. Ejemplo de escenario de extremo a extremo

### Escenario: Recibo

El usuario sube un recibo.

La IA identifica:

``` text
Merchant: Costco
Total: $522 MXN
Date: Aug 28, 2026
Category: Groceries
```

SUMA pregunta:

> "I found a \$522 purchase at Costco on Aug 28 and categorized it as
> Groceries. Is that correct?"

El usuario confirma.

La transacción se guarda.

------------------------------------------------------------------------

# 30. Ejemplo de escenario de extremo a extremo

### Escenario: Orientación financiera

El usuario ha proporcionado:

``` text
Ingresos mensuales: $30,000
Recurring expenses: $18,000
Average variable spending: $7,000
Savings: $20,000
Goal: $50,000 car fund
```

El usuario pregunta:

> "How long would it take me to save \$50,000?"

SUMA calcula utilizando la información disponible y explica:

> "Based on your current spending, you have aproximadamente \$5,000/month
> available. Saving that amount would take about 6 months to reach
> \$50,000, assuming your income and spending remain similar."

Después puede ofrecer escenarios:

``` text
Current pace     $5,000/month → ~6 months
Save $6,000/mo   → ~5 months
Save $7,000/mo   → ~4 months
```

The calculation must be deterministic and based on the stored financial
data.

------------------------------------------------------------------------

# 31. Definición de terminado

Un gasto se captura correctamente cuando:

-   Input was received through voice, text, or receipt.
-   Requerido information was extracted.
-   Fecha was correctly resolved.
-   AI output was validated.
-   User could review/correct the result.
-   Record was persisted.
-   UI confirmed the saved state.
-   Expense appears in history.
-   Expense contributes to metrics.
-   Chat can reference the expense.
-   Insights can use the expense.

Una recomendación financiera es exitosa cuando:

-   It uses available user context.
-   Calculations are reproducible.
-   Assumptions are visible.
-   Unavailable information is acknowledged.
-   The recommendation is presented as guidance, not certainty.

------------------------------------------------------------------------

# 32. Guía para Claude Code

Al implementar funcionalidades:

1.  Preserve the established visual language.
2.  Build responsive behavior from the beginning.
3.  Favor simple, maintainable components.
4.  Keep expense data in one source of truth.
5.  Use a shared extraction pipeline for voice, text, and receipts.
6.  Separate AI extraction from UI presentation.
7.  Validate all AI output before persistence.
8.  Use deterministic calculations for financial metrics.
9.  Keep mock/synthetic data separate from application logic.
10. Build accessibility into every component.
11. Provide loading, empty, success, and error states.
12. Preserve user input during errors whenever possible.
13. Do not invent missing receipt or transaction data.
14. Make uncertain AI interpretations explicit.
15. Keep financial advice grounded in actual user data.
16. Clearly distinguish facts, calculations, assumptions, and
    suggestions.
17. Keep P0 scope focused for the workshop.
18. When a requirement is ambiguous, make the smallest reasonable
    assumption and document it.

------------------------------------------------------------------------

# 33. North star del producto

> **Make financial awareness as easy as telling someone what you
> bought.**

SUMA debe permitir que una persona registre gastos de forma natural durante el
día, entienda a dónde se está yendo su dinero y tome decisiones financieras más informadas
basadas en su propia realidad.

------------------------------------------------------------------------

# 34. Sistema de diseño (obligatorio)

El lenguaje visual de SUMA está definido en **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)**
(Suma Design System v1.0, es-MX, light mode primero, WCAG 2.2 AA).

Reglas no negociables al implementar UI:

1.  Usa **solo tokens** de `src/styles/tokens.css`. Nunca hex crudo en un componente.
2.  La **acción primaria es tinta neutra** (`--action-primary`), no verde.
3.  Los **montos van en tinta primaria**; el color vive en el identificador
    (punto, icono, etiqueta), nunca en el número. Gastar no es un error: sin rojo.
4.  El **gradiente de marca** solo aparece en identidad, avatar de IA y el control de voz.
5.  **La conversación es la app**: sin tab bar de cuatro secciones, máximo dos niveles.
6.  Suma responde en **texto libre sobre el fondo**; el usuario habla en burbuja.
7.  La **tarjeta es la excepción**: listas homogéneas usan filas de 72px. Nunca tarjeta anidada.
8.  Los **diez estados de voz** siempre llevan texto visible y `aria-live`.
9.  Toda **gráfica** lleva una frase que la interpreta y etiquetas directas.
10. Ningún componente interactivo está terminado sin las nueve filas de la matriz de estados.

# 35. Arquitectura de esta implementación

```text
src/
├── styles/tokens.css      Tokens del design system (única fuente de color/tipo/espacio)
├── styles/global.css      Reset, tipografía base, foco, reduced-motion
├── lib/
│   ├── types.ts           Expense, FinancialProfile, FinancialGoal, ChatMessage
│   ├── categories.ts      Catálogo de categorías + icono + color de datos
│   ├── dates.ts           Resolución de fechas relativas (es/en) contra la zona del usuario
│   ├── money.ts           Formato de moneda tabular
│   ├── storage.ts         Persistencia (localStorage) — única fuente de verdad
│   ├── metrics.ts         Cálculos deterministas (totales, tendencias, comparaciones)
│   ├── insights.ts        Insights derivados de datos reales
│   ├── guidance.ts        Escenarios financieros deterministas
│   └── extraction/
│       ├── index.ts       Pipeline único voz/texto/recibo
│       ├── local.ts       Extractor determinista es/en (funciona sin red)
│       ├── remote.ts      Extractor vía Claude (`/api/*`) cuando hay API key
│       └── validate.ts    Validación y normalización de toda salida de IA
├── state/store.tsx        Estado de la app + acciones
├── components/            Piezas del design system
└── views/                 Hilo, historial, métricas, metas, ajustes, onboarding
server/anthropic.ts        Middleware de Vite: /api/extract, /api/receipt, /api/chat
```

**Pipeline único.** Voz, texto y recibo entran por `extractExpense()` y salen como el
mismo `Expense` normalizado. Toda salida del modelo pasa por `validate.ts` antes de
tocar el almacenamiento.

**Degradación honesta.** Sin `ANTHROPIC_API_KEY` la app usa el extractor determinista
local para voz y texto, y en recibos abre la revisión con los campos en "desconocido"
para que la persona los complete. **Nunca se inventa un dato que no se pudo extraer.**
