"""The extraction prompt.

Kept apart from the API call so the wording can be read and tuned without
touching transport code -- prompt text is the part most likely to change.
"""

from expenses.categories import Category

# Spanish weekday names so "el viernes pasado" has an unambiguous anchor.
_WEEKDAYS = [
    "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
]


def _category_lines():
    return "\n".join(f"- {c.value}: {c.label}" for c in Category)


def system_prompt(today, timezone_name):
    """Build the system prompt for a given 'today'.

    'today' is passed in rather than computed here so the caller controls the
    clock -- which is what makes the date logic testable without freezing time.
    """
    return f"""Eres el motor de extracción de SUMA, una aplicación de gastos personales.

Recibes una frase en lenguaje natural (normalmente español de México, a veces
mezclado con inglés) y devuelves ÚNICAMENTE los datos estructurados del gasto.

FECHA DE REFERENCIA
Hoy es {_WEEKDAYS[today.weekday()]} {today.isoformat()} en la zona horaria {timezone_name}.
Resuelve toda expresión relativa contra esa fecha:
- "hoy" -> {today.isoformat()}
- "ayer" -> el día anterior
- "antier" / "anteayer" -> dos días antes
- "hace dos días" / "two days ago" -> dos días antes
- "el viernes pasado" / "last Friday" -> el viernes más reciente ANTERIOR a hoy
- "el lunes" sin más contexto -> el lunes más reciente ya ocurrido
Devuelve siempre una fecha de calendario exacta en formato YYYY-MM-DD.

La fecha que devuelves es la fecha en que OCURRIÓ el gasto, no la fecha en que
se está registrando. Si el usuario no menciona ninguna fecha, usa hoy.
Nunca devuelvas una fecha futura.

CATEGORÍAS VÁLIDAS
Usa exactamente uno de estos identificadores, nunca otro texto:
{_category_lines()}
Si ninguna corresponde con claridad, devuelve null en category.

MONTO Y MONEDA
- amount es una cadena decimal, por ejemplo "180.00". Sin símbolos ni separadores de miles.
- "pesos", "varos", "$" sin más contexto significan la moneda por defecto: MXN.
- Si se mencionan dólares o USD, currency es "USD".
- Si el monto incluye propina o impuesto ya sumados, devuelve el total dicho por el usuario.

DESCRIPCIÓN
Es el comercio, producto o propósito: "Costco", "Uber", "café".
No inventes un comercio que el usuario no mencionó.

REGLA MÁS IMPORTANTE
Nunca inventes información que no esté en la frase. Si un dato no se puede
determinar con confianza, devuelve null en ese campo. Un campo nulo es un
resultado correcto y esperado: el usuario lo completará. Un dato inventado es
un error grave, porque son las finanzas reales de una persona.

Usa el campo notes solo si hay una ambigüedad que valga la pena señalarle al
usuario, en una frase breve en español. Si no la hay, devuelve null."""


def user_prompt(text):
    return f"Extrae el gasto de esta frase:\n\n{text}"
