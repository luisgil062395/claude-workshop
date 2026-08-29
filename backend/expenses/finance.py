"""Deterministic financial calculations.

Every number SUMA shows about goals, runway and spending limits is computed
here, in Python, from stored data. Claude may later put these numbers into a
sentence, but it never produces them: financial arithmetic has to be
reproducible and auditable, and a language model is neither.

Two rules run through the whole module:

1. No Infinity, no NaN, no misleading number. When a figure is undefined or
   unknowable, the function returns a `status` string and `None` -- the caller
   decides what to say. Silence is better than a made-up number.
2. Limits round DOWN, descriptions round HALF_UP. Telling someone they can
   spend $7,500 when the exact figure is $7,500.99 is safe; the reverse is not.
"""

from decimal import Decimal, ROUND_DOWN, ROUND_HALF_UP
from datetime import timedelta

from django.db.models import Count, Sum
from django.utils import timezone

from .categories import Category, is_essential
from .models import Expense

CENTS = Decimal("0.01")
MONTH_DAYS = Decimal("30.44")      # average calendar month
WEEKS_PER_MONTH = Decimal("4.348")

# Below this, an average from expense history is noise rather than a signal.
MIN_EXPENSES_FOR_AVERAGE = 5
MIN_DAYS_FOR_AVERAGE = 14


def to_json(value):
    """Convert computed Decimals to strings, recursively.

    DRF's JSON encoder renders a bare Decimal as a float, which would put
    30000.0 in the API where the rest of SUMA returns "30000.00". Money never
    crosses the wire as a float, so computed results pass through here at the
    view boundary -- matching what ExpenseSerializer already does for amounts.
    """
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: to_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_json(v) for v in value]
    return value


def money(value):
    """Round a descriptive money figure to cents."""
    return Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)


def limit(value):
    """Round a spending limit DOWN to cents. Never suggest more than is safe."""
    return Decimal(value).quantize(CENTS, rounding=ROUND_DOWN)


def months(value):
    """Runway in months, one decimal -- '3.8 meses' reads better than '3.75'."""
    return Decimal(value).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Observed spending, from real expense records
# ---------------------------------------------------------------------------

def observed_monthly_spending(days=90, overrides=None):
    """Average monthly spending derived from stored expenses.

    Returns None when there isn't enough history to be honest about. The
    feature spec is explicit: never fabricate an average. A caller that gets
    None must ask the user instead of guessing.
    """
    since = timezone.localdate() - timedelta(days=days)
    expenses = list(
        Expense.objects.filter(date__gte=since).values("category", "amount", "date")
    )

    if len(expenses) < MIN_EXPENSES_FOR_AVERAGE:
        return None

    dates = [e["date"] for e in expenses]
    span_days = (max(dates) - min(dates)).days + 1
    if span_days < MIN_DAYS_FOR_AVERAGE:
        return None

    essential = Decimal("0")
    discretionary = Decimal("0")
    for expense in expenses:
        if is_essential(expense["category"], overrides):
            essential += expense["amount"]
        else:
            discretionary += expense["amount"]

    span_months = Decimal(span_days) / MONTH_DAYS
    total = essential + discretionary

    return {
        "total_monthly": money(total / span_months),
        "essential_monthly": money(essential / span_months),
        "discretionary_monthly": money(discretionary / span_months),
        "expense_count": len(expenses),
        "days_observed": span_days,
        "source": "calculated",     # vs "provided" -- the UI must distinguish
    }


# ---------------------------------------------------------------------------
# Runway
# ---------------------------------------------------------------------------

def runway(savings, monthly_income, monthly_expenses):
    """How long the money lasts at a given burn rate.

    status:
      ok               -- a finite runway, `months` is set
      sustainable      -- income covers expenses; savings aren't being consumed
      no_expenses      -- nothing is being spent, so nothing to project
      no_savings       -- there is nothing to draw down
    """
    savings = Decimal(savings or 0)
    monthly_income = Decimal(monthly_income or 0)
    monthly_expenses = Decimal(monthly_expenses or 0)

    net_burn = monthly_expenses - monthly_income

    if monthly_expenses <= 0:
        return {"status": "no_expenses", "months": None,
                "net_burn": money(net_burn), "monthly_expenses": money(monthly_expenses)}

    if net_burn <= 0:
        # Income covers spending. Reporting a runway here would be misleading:
        # savings aren't being consumed at all.
        return {"status": "sustainable", "months": None,
                "net_burn": money(net_burn), "monthly_expenses": money(monthly_expenses),
                "monthly_surplus": money(-net_burn)}

    if savings <= 0:
        return {"status": "no_savings", "months": Decimal("0"),
                "net_burn": money(net_burn), "monthly_expenses": money(monthly_expenses)}

    return {
        "status": "ok",
        "months": months(savings / net_burn),
        "net_burn": money(net_burn),
        "monthly_expenses": money(monthly_expenses),
        "depletion_date": (
            timezone.localdate() + timedelta(days=int(savings / net_burn * MONTH_DAYS))
        ).isoformat(),
    }


def max_spending_for_runway(savings, monthly_income, desired_months):
    """The most you can spend per month and still last `desired_months`.

        max_net_burn    = savings / desired_months
        max_spending    = monthly_income + max_net_burn
    """
    savings = Decimal(savings or 0)
    monthly_income = Decimal(monthly_income or 0)

    if not desired_months or desired_months <= 0:
        return {"status": "no_target", "max_monthly_spending": None}

    if savings <= 0:
        # With no savings, sustainable spending is exactly your income.
        return {
            "status": "income_only",
            "max_monthly_spending": limit(monthly_income),
            "max_net_burn": Decimal("0"),
        }

    max_net_burn = savings / Decimal(desired_months)
    return {
        "status": "ok",
        "max_net_burn": limit(max_net_burn),
        "max_monthly_spending": limit(monthly_income + max_net_burn),
    }


def allowance(monthly_amount):
    """Weekly and daily planning guides, derived from the monthly figure.

    Monthly is the source of truth; these are approximate references, never
    permissions. The UI wording must keep them that way.
    """
    if monthly_amount is None or monthly_amount < 0:
        return None
    monthly = Decimal(monthly_amount)
    return {
        "monthly": limit(monthly),
        "weekly": limit(monthly / WEEKS_PER_MONTH),
        "daily": limit(monthly / MONTH_DAYS),
    }


def scenarios(plan, observed=None):
    """Exactly three scenarios: current, essential-only, target.

    Three is a deliberate ceiling -- the design system asks for one idea at a
    time, and a dozen projections is a spreadsheet, not an answer.
    """
    savings = plan.current_savings
    income = plan.monthly_income

    # Prefer what the user typed; fall back to what their expenses show.
    current_spending = plan.essential_expenses + plan.other_expenses
    spending_source = "provided"
    if current_spending <= 0 and observed:
        current_spending = observed["total_monthly"]
        spending_source = "calculated"

    essential_only = plan.essential_expenses
    if essential_only <= 0 and observed:
        essential_only = observed["essential_monthly"]

    result = [{
        "key": "current",
        "label": "Tu ritmo actual",
        "monthly_spending": money(current_spending),
        "source": spending_source,
        **runway(savings, income, current_spending),
    }]

    # Only worth showing if it actually differs from the current pace.
    if essential_only > 0 and essential_only < current_spending:
        result.append({
            "key": "essential",
            "label": "Solo lo esencial",
            "monthly_spending": money(essential_only),
            "source": spending_source,
            **runway(savings, income, essential_only),
        })

    if plan.desired_runway_months:
        target = max_spending_for_runway(savings, income, plan.desired_runway_months)
        if target["max_monthly_spending"] is not None:
            result.append({
                "key": "target",
                "label": f"Que dure {plan.desired_runway_months} meses",
                "monthly_spending": target["max_monthly_spending"],
                "source": "calculated",
                "status": "target",
                "months": Decimal(plan.desired_runway_months),
                "allowance": allowance(target["max_monthly_spending"]),
                "difference": money(current_spending - target["max_monthly_spending"]),
            })

    return result


# ---------------------------------------------------------------------------
# Savings goals
# ---------------------------------------------------------------------------

def goal_progress(goal, monthly_contribution=None):
    """Remaining amount, percentage, and -- if a date is set -- what it takes."""
    target = Decimal(goal.target_amount)
    current = Decimal(goal.current_amount)

    if target <= 0:
        return {"status": "invalid_target", "remaining": None, "percent": None}

    remaining = max(target - current, Decimal("0"))
    percent = min(
        (current / target * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP),
        Decimal("100"),
    )

    result = {
        "status": "complete" if remaining == 0 else "in_progress",
        "remaining": money(remaining),
        "percent": int(percent),
        "monthly_required": None,
        "months_remaining": None,
        "projected_date": None,
    }

    if remaining == 0:
        return result

    # With a target date: how much per month to land on time.
    if goal.target_date:
        days_left = (goal.target_date - timezone.localdate()).days
        if days_left <= 0:
            result["status"] = "overdue"
        else:
            months_left = Decimal(days_left) / MONTH_DAYS
            result["months_remaining"] = months(months_left)
            # Rounds UP: under-saving misses the date.
            result["monthly_required"] = money(
                (remaining / months_left).quantize(CENTS, rounding=ROUND_HALF_UP)
            )

    # With a contribution rate: when it would be reached.
    if monthly_contribution and monthly_contribution > 0:
        months_needed = remaining / Decimal(monthly_contribution)
        result["months_to_goal"] = months(months_needed)
        result["projected_date"] = (
            timezone.localdate() + timedelta(days=int(months_needed * MONTH_DAYS))
        ).isoformat()

    return result


# ---------------------------------------------------------------------------
# Financial context for conversational answers
# ---------------------------------------------------------------------------

def spending_by_category(days=90, top=6):
    """Recent spending grouped by category, biggest first."""
    since = timezone.localdate() - timedelta(days=days)
    rows = (
        Expense.objects.filter(date__gte=since)
        .values("category")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:top]
    )
    labels = dict(Category.choices)
    return [
        {
            "category": row["category"],
            "label": labels.get(row["category"], row["category"]),
            "total": money(row["total"]),
            "count": row["count"],
        }
        for row in rows
    ]


def financial_context(plan, goals, days=90):
    """Everything SUMA knows, already computed.

    This is the ONLY thing the language model is given. If a number is not in
    here, the model has no way to state it -- which is the point: Claude
    explains these figures, it never derives new ones.

    Assembled in Python, from the database, deterministically.
    """
    overrides = plan.essential_overrides or {}
    observed = observed_monthly_spending(days=days, overrides=overrides)

    return {
        "today": timezone.localdate().isoformat(),
        "currency": "MXN",
        "profile": {
            "current_savings": money(plan.current_savings),
            "monthly_income": money(plan.monthly_income),
            "essential_expenses": money(plan.essential_expenses),
            "other_expenses": money(plan.other_expenses),
            "desired_runway_months": plan.desired_runway_months,
            "source": "provided",
        },
        "observed_spending": observed,   # None when history is too thin
        "scenarios": scenarios(plan, observed),
        "goals": [
            {
                "name": goal.name,
                "target_amount": money(goal.target_amount),
                "current_amount": money(goal.current_amount),
                "target_date": goal.target_date.isoformat() if goal.target_date else None,
                "progress": goal_progress(goal),
            }
            for goal in goals
        ],
        "spending_by_category": spending_by_category(days=days),
        "expense_count": Expense.objects.count(),
    }


def has_any_financial_data(context):
    """Is there enough here to answer anything at all?

    With an empty context the honest response is to ask for data, not to spend
    an API call on a model that has nothing to work with.
    """
    profile = context["profile"]
    return any([
        Decimal(profile["current_savings"]) > 0,
        Decimal(profile["monthly_income"]) > 0,
        Decimal(profile["essential_expenses"]) > 0,
        Decimal(profile["other_expenses"]) > 0,
        context["goals"],
        context["expense_count"] > 0,
    ])
