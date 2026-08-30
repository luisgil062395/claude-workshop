SUMA 💰

Haz que entender tu dinero sea tan fácil como decirle a SUMA en qué gastaste.

SUMA es una aplicación web responsiva para registrar, entender y analizar tus gastos personales de forma sencilla y natural.

Puedes registrar un gasto hablando, escribiéndolo en el chat o tomando una foto de tu recibo. La IA transforma esa información en datos financieros estructurados que alimentan tu historial, métricas, tendencias e insights personalizados.

✨ ¿Qué es SUMA?

SUMA busca hacer que el control financiero sea accesible para personas que quieren entender mejor su dinero sin tener que convertirse en expertas en presupuestos.

Con SUMA puedes:

🎙️ Registrar gastos por voz hablando naturalmente.

💬 Registrar gastos y hacer preguntas por chat.

🧾 Fotografiar o subir recibos para extraer automáticamente su información.

📊 Entender tus patrones de gasto mediante métricas y tendencias.

💡 Recibir insights personalizados basados en tus gastos reales.

🎯 Definir metas financieras como ahorrar para un auto, unas vacaciones o un fondo de emergencia.

🤖 Explorar escenarios financieros utilizando tu propio contexto de ingresos, gastos, ahorros y metas.

🧠 Cómo funciona

Voz ───────┐
           │
Texto/Chat ┼──> IA → Extracción → Validación → Revisión → Guardar
           │
Recibo ────┘

Las tres rutas producen el mismo modelo normalizado de gasto.

Antes de guardar un registro generado por IA, el usuario puede revisar y corregir la información.

Ejemplo

Puedes decir:

"Ayer gasté 250 pesos en Soriana en el súper."

SUMA identifica:

{
  "amount": 250,
  "currency": "MXN",
  "description": "Soriana",
  "category": "groceries",
  "date": "2026-08-28",
  "inputMethod": "voice"
}

Después puedes revisar la información y confirmar el registro.

📱 Experiencia principal

Dashboard

El dashboard responde una pregunta simple:

¿Cómo voy con mi dinero?

Incluye gasto total, gasto por categoría, tendencias, gastos principales, transacciones recientes, insights personalizados y progreso de metas.

Historial

Permite consultar y administrar todos los gastos registrados mediante búsqueda, filtros, ordenamiento, edición, eliminación, detalle de transacciones y vista previa de recibos.

Métricas e insights

SUMA convierte los gastos registrados en información útil.

"Gastaste $52 más en restaurantes esta semana que la semana pasada."

"El transporte representa el 18% de tus gastos este mes."

Los insights deben ser específicos, basados en datos, explicables, útiles y sin juicios.

🎯 Metas financieras

Los usuarios pueden crear metas como:

Fondo de emergencia

Auto

Vacaciones

Hogar

Pago de deudas

Meta de ahorro

Compra importante

SUMA puede calcular el ahorro mensual necesario, tiempo estimado para alcanzar la meta, progreso actual y escenarios.

🤖 IA y confianza

La IA ayuda a interpretar la información financiera, mientras el usuario mantiene el control de sus registros.

SUMA debe:

Validar la salida de la IA antes de guardarla.

Detectar información faltante.

Identificar campos con incertidumbre.

Explicar supuestos.

Evitar inventar transacciones o información de recibos.

Pedir aclaraciones cuando la información sea ambigua.

Utilizar cálculos deterministas para métricas financieras.

Nunca crear o modificar silenciosamente un registro financiero cuando la IA tenga incertidumbre.

🔐 Privacidad

La información financiera y los recibos pueden contener datos sensibles.

SUMA busca minimizar los datos almacenados, solicitar permisos únicamente cuando sean necesarios, permitir eliminar gastos y recibos, evitar conservar grabaciones de voz innecesariamente y explicar cómo funciona el procesamiento mediante IA.

♿ Accesibilidad

SUMA tiene como objetivo cumplir con WCAG 2.2 AA.

La experiencia contempla lectores de pantalla, navegación por teclado, VoiceOver, tamaño de texto dinámico, alto contraste, movimiento reducido, estados de foco claros, HTML semántico, formularios y gráficas accesibles y alternativas para drag & drop.

La voz nunca debe ser la única forma de utilizar una funcionalidad.

📱 Responsive Web

SUMA es una aplicación web y debe funcionar de forma coherente en:

Desktop

Laptop

Tablet

Navegadores móviles

La interfaz se adapta al dispositivo mediante navegación, layouts e interacciones específicas para cada breakpoint.

🚀 MVP

P0 — Requerido

Entrada por voz

Entrada por texto/chat

Carga de fotos de recibos

Extracción mediante IA

Monto, moneda, descripción, categoría y fecha

Resolución de fechas relativas

Revisión y edición antes de guardar

Persistencia de gastos

Historial

Dashboard

Métricas básicas

Chat

Insights personalizados básicos

Layout web responsivo

Alternativas de texto accesibles

Onboarding sencillo

Ingreso básico

Gastos recurrentes básicos

Meta de ahorro opcional

Cálculos personalizados

P1 — Valioso

Extracción avanzada de recibos

Artículos individuales del recibo

Etiquetado de ubicación

Personalización de categorías

Comparaciones por periodo

Gráficas avanzadas

Correcciones por voz

Escenarios de metas financieras

Insights más personalizados

P2 — Futuro

Integraciones bancarias

Importación automática de transacciones

Finanzas compartidas del hogar

Detección de gastos recurrentes

Presupuestos avanzados

Seguimiento de inversiones

Soporte para múltiples cuentas

Categorización fiscal

El foco inicial es estabilizar la experiencia:

voz / texto / recibo
        ↓
gasto estructurado
        ↓
métricas + historial + insights

🗂️ Arquitectura de información

SUMA
│
├── Dashboard
│   ├── Resumen de gastos
│   ├── Gastos recientes
│   ├── Insights
│   └── Metas
│
├── Agregar gasto
│   ├── Voz
│   ├── Texto
│   └── Recibo
│
├── Gastos
│   ├── Historial
│   ├── Búsqueda
│   └── Filtros
│
├── Insights
│   ├── Tendencias
│   ├── Categorías
│   └── Comparaciones
│
├── Chat
│   └── Asistente financiero
│
└── Configuración
    ├── Perfil financiero
    ├── Categorías
    ├── Metas
    ├── Permisos
    └── Privacidad

🛠️ Principios de implementación

Conserva el lenguaje visual establecido.

Construye el comportamiento responsivo desde el principio.

Prioriza componentes simples y mantenibles.

Mantén los datos de gastos en una única fuente de verdad.

Utiliza un pipeline compartido para voz, texto y recibos.

Separa la extracción mediante IA de la presentación en UI.

Valida toda salida de IA antes de persistirla.

Utiliza cálculos deterministas para las métricas financieras.

Mantén los datos mock/sintéticos separados de la lógica de la aplicación.

Integra accesibilidad en cada componente.

Proporciona estados de carga, vacío, éxito y error.

Conserva la entrada del usuario durante los errores cuando sea posible.

No inventes datos faltantes.

Haz explícitas las interpretaciones inciertas de la IA.

Mantén la orientación financiera fundamentada en datos reales.

Distingue claramente entre hechos, cálculos, supuestos y sugerencias.

Mantén el alcance de P0 enfocado durante el workshop.

Cuando un requisito sea ambiguo, toma la suposición razonable más pequeña y documéntala.

🌟 North Star

Haz que la conciencia financiera sea tan fácil como decirle a alguien qué compraste.

SUMA permite registrar gastos naturalmente durante el día, entender a dónde se está yendo el dinero y tomar decisiones financieras más informadas basadas en la propia realidad del usuario.
