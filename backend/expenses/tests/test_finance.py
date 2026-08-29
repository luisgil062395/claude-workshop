"""Deterministic financial calculations.

These are the highest-value tests in the project: they cover the arithmetic a
person would actually make decisions on. No Claude, no network, no mocks --
pure functions over fixed inputs.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from expenses import finance
from expenses.models import Expense, FinancialGoal, RunwayPlan


class RunwayTests(TestCase):
    """Cases named in the feature spec, plus every edge case it lists."""

    def test_spec_example_savings_60k_no_income_15k_expenses(self):
        # 60,000 / 15,000 = exactly 4 months
        result = finance.runway(60000, 0, 15000)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["months"], Decimal("4.0"))
        self.assertEqual(result["net_burn"], Decimal("15000.00"))

    def test_spec_example_with_fractional_months(self):
        # 60,000 / 16,000 = 3.75 -> presented as 3.8
        result = finance.runway(60000, 0, 16000)
        self.assertEqual(result["months"], Decimal("3.8"))

    def test_income_reduces_the_burn_rate(self):
        # Spends 15,000, earns 5,000 -> burns 10,000 -> 6 months
        result = finance.runway(60000, 5000, 15000)
        self.assertEqual(result["months"], Decimal("6.0"))
        self.assertEqual(result["net_burn"], Decimal("10000.00"))

    def test_income_equal_to_expenses_is_sustainable_not_infinite(self):
        result = finance.runway(60000, 15000, 15000)
        self.assertEqual(result["status"], "sustainable")
        self.assertIsNone(result["months"])   # never Infinity

    def test_income_greater_than_expenses_reports_a_surplus(self):
        result = finance.runway(60000, 20000, 15000)
        self.assertEqual(result["status"], "sustainable")
        self.assertIsNone(result["months"])
        self.assertEqual(result["monthly_surplus"], Decimal("5000.00"))

    def test_zero_expenses_is_not_a_division_by_zero(self):
        result = finance.runway(60000, 0, 0)
        self.assertEqual(result["status"], "no_expenses")
        self.assertIsNone(result["months"])

    def test_zero_savings_is_zero_months_not_an_error(self):
        result = finance.runway(0, 0, 15000)
        self.assertEqual(result["status"], "no_savings")
        self.assertEqual(result["months"], Decimal("0"))

    def test_missing_values_are_treated_as_zero(self):
        result = finance.runway(None, None, None)
        self.assertEqual(result["status"], "no_expenses")

    def test_depletion_date_is_in_the_future(self):
        result = finance.runway(60000, 0, 15000)
        self.assertGreater(result["depletion_date"], timezone.localdate().isoformat())

    def test_no_result_is_ever_infinity_or_nan(self):
        for args in [(60000, 0, 15000), (60000, 20000, 15000), (0, 0, 0),
                     (0, 5000, 5000), (100, 0, 0.01)]:
            with self.subTest(args=args):
                value = finance.runway(*args)["months"]
                if value is not None:
                    self.assertTrue(value.is_finite())


class MaxSpendingTests(TestCase):
    def test_spec_example_max_net_burn(self):
        # 60,000 over 6 months = 10,000/month of savings drawdown
        result = finance.max_spending_for_runway(60000, 0, 6)
        self.assertEqual(result["max_net_burn"], Decimal("10000.00"))
        self.assertEqual(result["max_monthly_spending"], Decimal("10000.00"))

    def test_spec_example_with_income(self):
        # income 5,000 + burn 10,000 = 15,000/month total spending
        result = finance.max_spending_for_runway(60000, 5000, 6)
        self.assertEqual(result["max_monthly_spending"], Decimal("15000.00"))

    def test_spec_example_45k_over_6_months(self):
        # 45,000 / 6 = 7,500 -- the worked example in the feature request
        result = finance.max_spending_for_runway(45000, 0, 6)
        self.assertEqual(result["max_monthly_spending"], Decimal("7500.00"))

    def test_no_target_returns_no_number(self):
        for value in (None, 0):
            with self.subTest(value=value):
                result = finance.max_spending_for_runway(60000, 0, value)
                self.assertEqual(result["status"], "no_target")
                self.assertIsNone(result["max_monthly_spending"])

    def test_zero_savings_limits_spending_to_income(self):
        result = finance.max_spending_for_runway(0, 8000, 6)
        self.assertEqual(result["status"], "income_only")
        self.assertEqual(result["max_monthly_spending"], Decimal("8000.00"))

    def test_limits_round_down_never_up(self):
        # 10,000 / 3 = 3333.333... -> 3333.33, never 3333.34
        result = finance.max_spending_for_runway(10000, 0, 3)
        self.assertEqual(result["max_monthly_spending"], Decimal("3333.33"))


class AllowanceTests(TestCase):
    def test_derives_weekly_and_daily_from_monthly(self):
        result = finance.allowance(Decimal("9000"))
        self.assertEqual(result["monthly"], Decimal("9000.00"))
        self.assertEqual(result["weekly"], Decimal("2069.91"))   # 9000 / 4.348
        self.assertEqual(result["daily"], Decimal("295.66"))     # 9000 / 30.44

    def test_none_for_missing_or_negative(self):
        self.assertIsNone(finance.allowance(None))
        self.assertIsNone(finance.allowance(Decimal("-1")))

    def test_guides_never_exceed_the_monthly_source_of_truth(self):
        result = finance.allowance(Decimal("9000"))
        self.assertLess(result["daily"] * 30, result["monthly"] * Decimal("1.01"))


class ObservedSpendingTests(TestCase):
    """Never fabricate an average."""

    def make_expenses(self, count, amount="1000", category="food", spread_days=30):
        today = timezone.localdate()
        for i in range(count):
            Expense.objects.create(
                amount=Decimal(amount), currency="MXN",
                description=f"Gasto {i}", category=category,
                date=today - timedelta(days=(i * spread_days // max(count - 1, 1))),
            )

    def test_returns_none_with_no_expenses(self):
        self.assertIsNone(finance.observed_monthly_spending())

    def test_returns_none_below_the_minimum_count(self):
        self.make_expenses(3)
        self.assertIsNone(finance.observed_monthly_spending())

    def test_returns_none_when_the_window_is_too_short(self):
        # Enough expenses, but all on the same day -- not a monthly average.
        today = timezone.localdate()
        for i in range(8):
            Expense.objects.create(
                amount=Decimal("500"), currency="MXN",
                description=f"Gasto {i}", category="food", date=today,
            )
        self.assertIsNone(finance.observed_monthly_spending())

    def test_computes_an_average_with_enough_history(self):
        self.make_expenses(10, amount="1000", spread_days=30)
        result = finance.observed_monthly_spending()
        self.assertIsNotNone(result)
        self.assertEqual(result["source"], "calculated")
        self.assertEqual(result["expense_count"], 10)
        self.assertGreater(result["total_monthly"], 0)

    def test_splits_essential_from_discretionary(self):
        self.make_expenses(6, amount="1000", category="groceries", spread_days=30)
        self.make_expenses(6, amount="500", category="entertainment", spread_days=30)
        result = finance.observed_monthly_spending()
        self.assertGreater(result["essential_monthly"], 0)      # groceries
        self.assertGreater(result["discretionary_monthly"], 0)  # entertainment
        self.assertEqual(
            result["total_monthly"],
            result["essential_monthly"] + result["discretionary_monthly"],
        )

    def test_user_override_moves_a_category(self):
        self.make_expenses(10, amount="1000", category="transportation", spread_days=30)
        default = finance.observed_monthly_spending()
        self.assertGreater(default["essential_monthly"], 0)  # essential by default

        overridden = finance.observed_monthly_spending(
            overrides={"transportation": False}
        )
        self.assertEqual(overridden["essential_monthly"], Decimal("0.00"))
        self.assertGreater(overridden["discretionary_monthly"], 0)


class GoalProgressTests(TestCase):
    def goal(self, target="50000", current="20000", target_date=None):
        return FinancialGoal.objects.create(
            name="Fondo de emergencia",
            target_amount=Decimal(target),
            current_amount=Decimal(current),
            target_date=target_date,
        )

    def test_spec_example_40_percent(self):
        result = finance.goal_progress(self.goal())
        self.assertEqual(result["percent"], 40)
        self.assertEqual(result["remaining"], Decimal("30000.00"))
        self.assertEqual(result["status"], "in_progress")

    def test_completed_goal(self):
        result = finance.goal_progress(self.goal(current="50000"))
        self.assertEqual(result["percent"], 100)
        self.assertEqual(result["remaining"], Decimal("0.00"))
        self.assertEqual(result["status"], "complete")

    def test_overshooting_caps_at_100_percent(self):
        result = finance.goal_progress(self.goal(current="80000"))
        self.assertEqual(result["percent"], 100)
        self.assertEqual(result["remaining"], Decimal("0.00"))

    def test_zero_progress(self):
        result = finance.goal_progress(self.goal(current="0"))
        self.assertEqual(result["percent"], 0)

    def test_monthly_required_from_a_target_date(self):
        # 30,000 remaining over ~6 months
        goal = self.goal(target_date=timezone.localdate() + timedelta(days=183))
        result = finance.goal_progress(goal)
        self.assertIsNotNone(result["monthly_required"])
        self.assertAlmostEqual(float(result["monthly_required"]), 4990, delta=60)

    def test_past_target_date_is_overdue_not_negative(self):
        goal = self.goal(target_date=timezone.localdate() - timedelta(days=10))
        result = finance.goal_progress(goal)
        self.assertEqual(result["status"], "overdue")
        self.assertIsNone(result["monthly_required"])

    def test_projected_date_from_a_contribution_rate(self):
        result = finance.goal_progress(self.goal(), monthly_contribution=Decimal("5000"))
        self.assertEqual(result["months_to_goal"], Decimal("6.0"))
        self.assertIsNotNone(result["projected_date"])

    def test_invalid_target_returns_no_percentage(self):
        goal = FinancialGoal(name="Rota", target_amount=Decimal("0"),
                             current_amount=Decimal("0"))
        result = finance.goal_progress(goal)
        self.assertEqual(result["status"], "invalid_target")
        self.assertIsNone(result["percent"])


class ScenarioTests(TestCase):
    """Exactly three scenarios, and only when they say something different."""

    def plan(self, **kwargs):
        defaults = dict(
            current_savings=Decimal("45000"), monthly_income=Decimal("0"),
            essential_expenses=Decimal("11000"), other_expenses=Decimal("3000"),
            desired_runway_months=6,
        )
        defaults.update(kwargs)
        plan = RunwayPlan.load()
        for key, value in defaults.items():
            setattr(plan, key, value)
        plan.save()
        return plan

    def test_spec_worked_example(self):
        # 45,000 savings, 14,000/month spending, wants 6 months
        result = finance.scenarios(self.plan())
        by_key = {s["key"]: s for s in result}

        self.assertEqual(by_key["current"]["monthly_spending"], Decimal("14000.00"))
        self.assertEqual(by_key["current"]["months"], Decimal("3.2"))

        self.assertEqual(by_key["essential"]["monthly_spending"], Decimal("11000.00"))
        self.assertEqual(by_key["essential"]["months"], Decimal("4.1"))

        self.assertEqual(by_key["target"]["monthly_spending"], Decimal("7500.00"))
        self.assertEqual(by_key["target"]["difference"], Decimal("6500.00"))

    def test_never_more_than_three_scenarios(self):
        self.assertLessEqual(len(finance.scenarios(self.plan())), 3)

    def test_essential_scenario_hidden_when_it_matches_current(self):
        # No discretionary spending -> "essential only" would be identical.
        result = finance.scenarios(self.plan(other_expenses=Decimal("0")))
        self.assertNotIn("essential", [s["key"] for s in result])

    def test_target_scenario_absent_without_a_desired_runway(self):
        result = finance.scenarios(self.plan(desired_runway_months=None))
        self.assertNotIn("target", [s["key"] for s in result])

    def test_target_includes_daily_and_weekly_guides(self):
        target = next(s for s in finance.scenarios(self.plan()) if s["key"] == "target")
        self.assertIn("allowance", target)
        self.assertEqual(target["allowance"]["monthly"], Decimal("7500.00"))

    def test_falls_back_to_observed_spending_when_nothing_was_entered(self):
        plan = self.plan(essential_expenses=Decimal("0"), other_expenses=Decimal("0"))
        observed = {
            "total_monthly": Decimal("15200.00"),
            "essential_monthly": Decimal("9000.00"),
            "discretionary_monthly": Decimal("6200.00"),
        }
        current = finance.scenarios(plan, observed)[0]
        self.assertEqual(current["monthly_spending"], Decimal("15200.00"))
        # The UI must be able to say where this number came from.
        self.assertEqual(current["source"], "calculated")

    def test_provided_values_win_over_observed(self):
        observed = {
            "total_monthly": Decimal("99999.00"),
            "essential_monthly": Decimal("9000.00"),
            "discretionary_monthly": Decimal("6200.00"),
        }
        current = finance.scenarios(self.plan(), observed)[0]
        self.assertEqual(current["monthly_spending"], Decimal("14000.00"))
        self.assertEqual(current["source"], "provided")
