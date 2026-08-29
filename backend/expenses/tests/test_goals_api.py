"""Goals and runway endpoints."""

import json
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from expenses.models import Expense, FinancialGoal, RunwayPlan


class GoalEndpointTests(TestCase):
    def create(self, **body):
        payload = {"name": "Fondo de emergencia", "target_amount": "50000",
                   "current_amount": "20000", **body}
        return self.client.post(reverse("goal-list"), data=json.dumps(payload),
                                content_type="application/json")

    def test_creates_a_goal_with_computed_progress(self):
        response = self.create()
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["progress"]["percent"], 40)
        self.assertEqual(data["progress"]["remaining"], "30000.00")

    def test_progress_is_recomputed_never_stored(self):
        goal_id = self.create().json()["id"]
        self.client.patch(reverse("goal-detail", args=[goal_id]),
                          data=json.dumps({"current_amount": "25000"}),
                          content_type="application/json")
        data = self.client.get(reverse("goal-detail", args=[goal_id])).json()
        self.assertEqual(data["progress"]["percent"], 50)

    def test_rejects_zero_target(self):
        response = self.create(target_amount="0")
        self.assertEqual(response.status_code, 400)
        self.assertIn("target_amount", response.json())

    def test_rejects_negative_current_amount(self):
        response = self.create(current_amount="-100")
        self.assertEqual(response.status_code, 400)

    def test_rejects_blank_name(self):
        response = self.create(name="   ")
        self.assertEqual(response.status_code, 400)

    def test_deletes(self):
        goal_id = self.create().json()["id"]
        self.client.delete(reverse("goal-detail", args=[goal_id]))
        self.assertEqual(FinancialGoal.objects.count(), 0)


class RunwayEndpointTests(TestCase):
    def put(self, **body):
        return self.client.put(reverse("runway"), data=json.dumps(body),
                               content_type="application/json")

    def test_get_creates_an_empty_plan_on_first_use(self):
        self.assertEqual(RunwayPlan.objects.count(), 0)
        response = self.client.get(reverse("runway"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(RunwayPlan.objects.count(), 1)

    def test_stays_a_singleton(self):
        self.put(current_savings="45000")
        self.put(current_savings="60000")
        self.assertEqual(RunwayPlan.objects.count(), 1)
        self.assertEqual(RunwayPlan.load().current_savings, Decimal("60000"))

    def test_spec_worked_example_end_to_end(self):
        response = self.put(
            current_savings="45000", monthly_income="0",
            essential_expenses="11000", other_expenses="3000",
            desired_runway_months=6,
        )
        self.assertEqual(response.status_code, 200)
        scenarios = {s["key"]: s for s in response.json()["scenarios"]}
        self.assertEqual(scenarios["current"]["months"], "3.2")
        self.assertEqual(scenarios["target"]["monthly_spending"], "7500.00")
        self.assertEqual(scenarios["target"]["difference"], "6500.00")

    def test_lost_job_means_zero_income_is_accepted(self):
        response = self.put(current_savings="60000", monthly_income="0",
                            essential_expenses="12000", other_expenses="4000")
        self.assertEqual(response.status_code, 200)
        current = response.json()["scenarios"][0]
        self.assertEqual(current["months"], "3.8")   # 60000 / 16000

    def test_rejects_negative_savings(self):
        response = self.put(current_savings="-100")
        self.assertEqual(response.status_code, 400)
        self.assertIn("current_savings", response.json())

    def test_rejects_zero_desired_runway(self):
        # Zero would be a division by zero and means nothing as a goal.
        response = self.put(desired_runway_months=0)
        self.assertEqual(response.status_code, 400)

    def test_accepts_null_desired_runway(self):
        self.assertEqual(self.put(desired_runway_months=None).status_code, 200)

    def test_reports_no_observed_spending_without_history(self):
        response = self.client.get(reverse("runway"))
        self.assertIsNone(response.json()["observed_spending"])

    def test_reports_observed_spending_with_enough_history(self):
        today = timezone.localdate()
        for i in range(10):
            Expense.objects.create(
                amount=Decimal("1000"), currency="MXN", description=f"G{i}",
                category="food", date=today - timedelta(days=i * 3),
            )
        observed = self.client.get(reverse("runway")).json()["observed_spending"]
        self.assertIsNotNone(observed)
        self.assertEqual(observed["source"], "calculated")

    def test_exposes_essential_flags_and_user_overrides(self):
        data = self.client.get(reverse("runway")).json()
        by_slug = {c["value"]: c for c in data["categories"]}
        self.assertTrue(by_slug["groceries"]["essential"])
        self.assertFalse(by_slug["entertainment"]["essential"])
        self.assertFalse(by_slug["transportation"]["overridden"])

        self.put(essential_overrides={"transportation": False})
        data = self.client.get(reverse("runway")).json()
        by_slug = {c["value"]: c for c in data["categories"]}
        self.assertFalse(by_slug["transportation"]["essential"])
        self.assertTrue(by_slug["transportation"]["overridden"])

    def test_rejects_unknown_category_in_overrides(self):
        response = self.put(essential_overrides={"cripto": True})
        self.assertEqual(response.status_code, 400)

    def test_never_returns_infinity_when_income_covers_expenses(self):
        response = self.put(current_savings="60000", monthly_income="20000",
                            essential_expenses="10000", other_expenses="5000")
        current = response.json()["scenarios"][0]
        self.assertEqual(current["status"], "sustainable")
        self.assertIsNone(current["months"])
