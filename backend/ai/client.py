import os

import anthropic


class ExtractionError(Exception):
    """Anything that stops us returning a usable draft.

    Carries a message already written for the user, in Spanish, because the view
    passes it straight to the frontend.
    """


# One client for the process. Building it is cheap but pointless to repeat.
_client = None


def get_client():
    """Return the Anthropic client, or raise ExtractionError if unconfigured.

    The key is read from the server environment only. It is never sent to the
    browser and never appears in an API response.
    """
    global _client

    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ExtractionError(
                "El servidor no tiene configurada ANTHROPIC_API_KEY. "
                "Puedes capturar el gasto manualmente."
            )
        _client = anthropic.Anthropic(
            api_key=api_key,
            timeout=30.0,   # a user is waiting on this request
            max_retries=2,
        )

    return _client
