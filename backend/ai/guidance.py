"""Conversational explanation of already-computed financial results.

The pipeline this implements:

    user question
      -> Django gathers the user's data
      -> Python computes every figure (expenses/finance.py)
      -> structured result
      -> Claude puts THAT into a sentence

Never the other way round. This module takes a plain dict of finished numbers
and returns prose. It imports no models and performs no arithmetic -- the same
structural guarantee that keeps ai/extraction.py out of the database.
"""

import json

import anthropic

from .client import ExtractionError, get_client
from .prompts import GUIDANCE_SYSTEM, guidance_user_prompt

MODEL = "claude-opus-5"

# Two to five sentences of Spanish. The ceiling is deliberate: a long answer
# invites the model to pad with figures it wasn't given.
MAX_TOKENS = 800


def explain(question, context):
    """Answer `question` using only the numbers in `context`.

    Raises ExtractionError with a message already written for the user.
    """
    client = get_client()

    # ensure_ascii=False keeps the accented Spanish labels readable to the
    # model rather than escaping them into \\uXXXX noise.
    context_json = json.dumps(context, ensure_ascii=False, indent=2, default=str)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=GUIDANCE_SYSTEM,
            messages=[
                {"role": "user", "content": guidance_user_prompt(question, context_json)}
            ],
            # Restating given figures is not a hard reasoning task, and a person
            # is waiting on the response. Raise this if answers get sloppy.
            output_config={"effort": "low"},
        )
    except anthropic.AuthenticationError:
        raise ExtractionError(
            "La clave de Anthropic del servidor no es válida. "
            "Tus cifras siguen disponibles arriba."
        )
    except anthropic.RateLimitError:
        raise ExtractionError(
            "El servicio está saturado ahora mismo. Intenta de nuevo en un momento."
        )
    except anthropic.APIConnectionError:
        raise ExtractionError(
            "No pude contactar el servicio. Revisa tu conexión; "
            "tus cifras siguen disponibles arriba."
        )
    except anthropic.APIStatusError as error:
        raise ExtractionError(
            f"El servicio respondió con un error ({error.status_code})."
        )

    text = "".join(
        block.text
        for block in response.content
        if getattr(block, "type", None) == "text"
    ).strip()

    if not text:
        raise ExtractionError("No pude generar una respuesta. Intenta de nuevo.")

    return text
