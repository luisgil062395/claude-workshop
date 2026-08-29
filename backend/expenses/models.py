import uuid

from django.db import models

from .categories import Category, InputMethod


class Expense(models.Model):
    """A single recorded expense -- the one source of truth for the whole app.

    Only the fields CLAUDE.md marks as required exist so far. The optional ones
    (receipt_image, tax, tip, items, location, confidence) arrive at the
    milestone that actually uses them.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Money is Decimal, never float. Rounding errors in a finance app are the
    # kind of bug you never notice and never forgive.
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="MXN")
    description = models.CharField(max_length=200)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )

    # date  = when the expense happened (may be in the past)
    # created_at = when it was recorded
    # CLAUDE.md section 9: never let one overwrite the other.
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    input_method = models.CharField(
        max_length=10, choices=InputMethod.choices, default=InputMethod.TEXT
    )
    raw_input = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.amount} {self.currency} - {self.description} ({self.date})"


class FinancialGoal(models.Model):
    """A savings goal: "quiero ahorrar $30,000".

    Deliberately separate from RunwayPlan. Merging the two behind a `goal_type`
    column would leave half the fields NULL on every row and force validation
    to branch on type -- more schema, not less.

    Progress is never stored: it is derived in finance.py from these fields, so
    a stale percentage can't drift away from the amounts it came from.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    target_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name}: {self.current_amount}/{self.target_amount}"


class RunwayPlan(models.Model):
    """The user's current financial situation, for "how long will my money last".

    A singleton: the workshop MVP represents one local user (CLAUDE.md scope,
    and there is no authentication). Adding auth later means adding a nullable
    user FK and dropping the singleton constraint -- not restructuring.

    This doubles as the small "financial profile" from CLAUDE.md section 12,
    because its fields ARE the profile: savings, income, expense estimates.
    Splitting them into a second model would add a join and an ambiguity about
    which copy is authoritative.
    """

    SINGLETON_ID = 1

    id = models.PositiveSmallIntegerField(primary_key=True, default=SINGLETON_ID)

    current_savings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    essential_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    desired_runway_months = models.PositiveSmallIntegerField(null=True, blank=True)

    # Per-user essential/discretionary overrides, {category_slug: bool}. Only
    # the user's disagreements with DEFAULT_ESSENTIAL are stored.
    essential_overrides = models.JSONField(default=dict, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        """Get the single plan, creating an empty one on first use."""
        plan, _ = cls.objects.get_or_create(pk=cls.SINGLETON_ID)
        return plan

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_ID   # enforce the singleton
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Plan: {self.current_savings} ahorro, {self.monthly_income} ingreso"
