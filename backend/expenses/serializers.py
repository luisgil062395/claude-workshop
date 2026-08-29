"""Validation layer.

This is the only gate into the database. From milestone 3 onward, Claude's
extraction output passes through this exact serializer before it can become a
row -- CLAUDE.md section 23: "never let raw model output modify financial
records directly."

So every rule here has to be strict enough to catch a hallucinating model, not
just a mistyped form.
"""

from datetime import date as date_cls, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from . import categories
from .models import Expense

# An expense dated further ahead than this is almost certainly a bad date
# resolution ("next Friday" misread) rather than a real future purchase.
MAX_FUTURE_DAYS = 1
EARLIEST_DATE = date_cls(2000, 1, 1)
MAX_AMOUNT = Decimal("100000000")


class ExpenseSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)

    # Declared explicitly as a CharField rather than letting ModelSerializer
    # build a ChoiceField: a ChoiceField rejects anything outside the enum
    # *before* validate_category() runs, so "Groceries" or "Supermercado" would
    # never reach the normalizer. Milestone 3 depends on it reaching it.
    category = serializers.CharField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "amount",
            "currency",
            "description",
            "category",
            "category_label",
            "date",
            "created_at",
            "input_method",
            "raw_input",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto debe ser mayor que cero.")
        if value > MAX_AMOUNT:
            raise serializers.ValidationError("El monto es demasiado grande.")
        return value

    def validate_currency(self, value):
        code = value.strip().upper()
        if len(code) != 3 or not code.isalpha():
            raise serializers.ValidationError(
                "La moneda debe ser un código ISO de 3 letras."
            )
        return code

    def validate_description(self, value):
        description = value.strip()
        if not description:
            raise serializers.ValidationError("La descripción no puede estar vacía.")
        return description

    def validate_category(self, value):
        slug = categories.normalize(value)
        if slug is None:
            raise serializers.ValidationError(f"Categoría desconocida: {value!r}")
        return slug

    def validate_date(self, value):
        # localdate() respects settings.TIME_ZONE, so "today" means the user's
        # today -- which is the whole point once Claude starts resolving "ayer".
        today = timezone.localdate()
        if value > today + timedelta(days=MAX_FUTURE_DAYS):
            raise serializers.ValidationError("La fecha no puede estar en el futuro.")
        if value < EARLIEST_DATE:
            raise serializers.ValidationError("La fecha es demasiado antigua.")
        return value
