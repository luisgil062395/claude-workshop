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

from . import categories, finance
from .categories import Category
from .models import Expense, FinancialGoal, RunwayPlan

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


class FinancialGoalSerializer(serializers.ModelSerializer):
    """Validation gate for savings goals, mirroring ExpenseSerializer's approach.

    `progress` is read-only and computed on every read, so a stored percentage
    can never drift out of sync with the amounts behind it.
    """

    progress = serializers.SerializerMethodField()

    class Meta:
        model = FinancialGoal
        fields = [
            "id", "name", "target_amount", "current_amount",
            "target_date", "created_at", "progress",
        ]
        read_only_fields = ["id", "created_at"]

    def get_progress(self, goal):
        return finance.to_json(finance.goal_progress(goal))

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Ponle un nombre a tu meta.")
        return name

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("La meta debe ser mayor que cero.")
        if value > MAX_AMOUNT:
            raise serializers.ValidationError("La cantidad es demasiado grande.")
        return value

    def validate_current_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Lo ahorrado no puede ser negativo.")
        if value > MAX_AMOUNT:
            raise serializers.ValidationError("La cantidad es demasiado grande.")
        return value


class RunwayPlanSerializer(serializers.ModelSerializer):
    """Validation gate for the runway inputs.

    Every money field must be zero or positive. Zero is meaningful here and
    must be accepted: "perdí mi trabajo" is exactly monthly_income = 0.
    """

    class Meta:
        model = RunwayPlan
        fields = [
            "current_savings", "monthly_income", "essential_expenses",
            "other_expenses", "desired_runway_months", "essential_overrides",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def _non_negative(self, value, message):
        if value < 0:
            raise serializers.ValidationError(message)
        if value > MAX_AMOUNT:
            raise serializers.ValidationError("La cantidad es demasiado grande.")
        return value

    def validate_current_savings(self, v):
        return self._non_negative(v, "Tus ahorros no pueden ser negativos.")

    def validate_monthly_income(self, v):
        return self._non_negative(v, "Tu ingreso no puede ser negativo.")

    def validate_essential_expenses(self, v):
        return self._non_negative(v, "Tus gastos esenciales no pueden ser negativos.")

    def validate_other_expenses(self, v):
        return self._non_negative(v, "Tus otros gastos no pueden ser negativos.")

    def validate_desired_runway_months(self, value):
        # None means "no target set" -- valid. 0 is not: it would ask for a
        # division by zero and means nothing as a goal.
        if value is None:
            return None
        if value <= 0:
            raise serializers.ValidationError("El plazo debe ser de al menos un mes.")
        if value > 600:
            raise serializers.ValidationError("El plazo es demasiado largo.")
        return value

    def validate_essential_overrides(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Formato inválido.")
        cleaned = {}
        for slug, essential in value.items():
            if slug not in Category.values:
                raise serializers.ValidationError(f"Categoría desconocida: {slug!r}")
            cleaned[slug] = bool(essential)
        return cleaned
