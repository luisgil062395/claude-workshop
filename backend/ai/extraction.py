"""Natural language -> candidate expense fields.

Returns a plain dict whose values may be None. It performs NO validation and
NO normalization: that is expenses/serializers.py's job, and keeping it there
means voice, text and (later) receipts all get the identical treatment.
"""

import json

import anthropic

from .client import ExtractionError, get_client
from .prompts import system_prompt, user_prompt

MODEL = "claude-opus-5"

# Every field is nullable and every field is required: that combination is what
# lets the model say "I could not determine this" instead of inventing a value.
EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "amount": {
            "type": ["string", "null"],
            "description": 'Monto como cadena decimal, por ejemplo "180.00".',
        },
        "currency": {
            "type": ["string", "null"],
            "description": "Código ISO de 3 letras, MXN por defecto.",
        },
        "description": {
            "type": ["string", "null"],
            "description": "Comercio, producto o propósito del gasto.",
        },
        "category": {
            # Constrained by the prompt rather than a schema enum: nullable
            # enums are one more schema feature that has to be accepted by the
            # API, and categories/normalize() plus the serializer already reject
            # anything invalid. Fewer untested moving parts on the boundary.
            "type": ["string", "null"],
            "description": "Identificador de categoría SUMA, o null.",
        },
        "date": {
            "type": ["string", "null"],
            "description": "Fecha en que ocurrió el gasto, YYYY-MM-DD.",
        },
        "notes": {
            "type": ["string", "null"],
            "description": "Ambigüedad que valga la pena señalar, o null.",
        },
    },
    "required": ["amount", "currency", "description", "category", "date", "notes"],
    "additionalProperties": False,
}

FIELDS = tuple(EXTRACTION_SCHEMA["properties"])


def extract_expense(text, today, timezone_name):
    """Ask Claude to interpret `text`. Raises ExtractionError on any failure."""
    client = get_client()

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system_prompt(today, timezone_name),
            messages=[{"role": "user", "content": user_prompt(text)}],
            output_config={
                "format": {"type": "json_schema", "schema": EXTRACTION_SCHEMA},
                # A short extraction with simple date arithmetic: low effort keeps
                # the user's wait short. Raise this if accuracy ever suffers.
                "effort": "low",
            },
        )
    except anthropic.AuthenticationError:
        raise ExtractionError(
            "La clave de Anthropic del servidor no es válida. "
            "Puedes capturar el gasto manualmente."
        )
    except anthropic.RateLimitError:
        raise ExtractionError(
            "El servicio de interpretación está saturado. Intenta de nuevo en un momento."
        )
    except anthropic.APIConnectionError:
        raise ExtractionError(
            "No se pudo contactar el servicio de interpretación. Revisa tu conexión."
        )
    except anthropic.APIStatusError as error:
        raise ExtractionError(
            f"El servicio de interpretación respondió con un error ({error.status_code})."
        )

    return _parse(response)


def _parse(response):
    """Pull the JSON object out of the response, defensively.

    output_config guarantees valid JSON in a text block, but this is the
    boundary with an external system: if the guarantee ever fails we want a
    clean Spanish error, not a TypeError in a traceback.
    """
    text = next(
        (block.text for block in response.content if getattr(block, "type", None) == "text"),
        None,
    )
    if not text:
        raise ExtractionError("El servicio de interpretación no devolvió datos.")

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise ExtractionError("El servicio de interpretación devolvió datos ilegibles.")

    if not isinstance(data, dict):
        raise ExtractionError("El servicio de interpretación devolvió datos ilegibles.")

    # Keep only the keys we asked for, so an unexpected extra key can never be
    # forwarded into the serializer.
    return {field: data.get(field) for field in FIELDS}
