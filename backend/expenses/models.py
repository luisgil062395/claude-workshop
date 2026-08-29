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
