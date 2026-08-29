"""Expense categories.

The canonical set from CLAUDE.md section 10. Values are stable English slugs
(they go in the database and in the AI extraction prompt); labels are Spanish
because that is what the UI shows.

Kept in its own module because three things need it: the model's choices,
the serializer's normalization, and -- from milestone 3 -- the Claude prompt.
"""

from django.db import models


class Category(models.TextChoices):
    FOOD = "food", "Comida y restaurantes"
    GROCERIES = "groceries", "Supermercado"
    TRANSPORTATION = "transportation", "Transporte"
    SHOPPING = "shopping", "Compras"
    HOUSING = "housing", "Vivienda"
    BILLS = "bills", "Servicios y facturas"
    HEALTH = "health", "Salud"
    ENTERTAINMENT = "entertainment", "Entretenimiento"
    TRAVEL = "travel", "Viajes"
    EDUCATION = "education", "Educación"
    PERSONAL = "personal", "Personal"
    SUBSCRIPTIONS = "subscriptions", "Suscripciones"
    OTHER = "other", "Otros"


class InputMethod(models.TextChoices):
    VOICE = "voice", "Voz"
    TEXT = "text", "Texto"
    RECEIPT = "receipt", "Recibo"


def normalize(value):
    """Map a loose category string onto a valid slug.

    Returns None when the value cannot be mapped, so the caller decides whether
    that means "ask the user" (AI extraction) or "reject" (direct user input).
    Milestone 3 is what makes this earn its keep -- Claude may answer
    "Groceries" or "supermercado" where the database wants "groceries".
    """
    if not value:
        return None

    slug = str(value).strip().lower().replace(" ", "_")
    if slug in Category.values:
        return slug

    for category in Category:
        if slug == category.label.lower():
            return category.value

    return None


# Which categories are essential *by default*. This is a starting point, not a
# judgment: CLAUDE.md and the runway feature both require that the user can
# disagree, because circumstances differ (transport is essential if you commute
# to work, discretionary if you don't). Overrides live on the RunwayPlan, so
# this stays a default and never becomes a fact baked into the schema.
DEFAULT_ESSENTIAL = {
    Category.HOUSING,
    Category.GROCERIES,
    Category.BILLS,
    Category.HEALTH,
    Category.TRANSPORTATION,
    Category.EDUCATION,
}


def is_essential(slug, overrides=None):
    """Is this category essential for this user?

    `overrides` is the user's own {slug: bool} map; anything absent falls back
    to DEFAULT_ESSENTIAL.
    """
    if overrides and slug in overrides:
        return bool(overrides[slug])
    return slug in DEFAULT_ESSENTIAL
