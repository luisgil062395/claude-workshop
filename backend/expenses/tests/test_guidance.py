"""The conversational guidance boundary.

Claude is mocked. What matters here is the contract around it: that the context
handed over is complete and already computed, that no arithmetic is delegated,
and that a failure never costs the user their data.
"""

import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from ai.client import ExtractionError
from expenses import finance
from expenses.models import Expense, FinancialGoal, RunwayPlan


class FinancialContextTests(TestCase):
    """The context is the model's entire world -- it must be complete and computed."""

    def setUp(self):
        self.plan = RunwayPlan.load()
        self.plan.current_savings = Decimal("45000")
        self.plan.monthly_income = Decimal("0")
        self.plan.essential_expenses = Decimal("11000")
        self.plan.other_expenses = Decimal("3000")
        self.plan.desired_runway_months = 6
        self.plan.save()

    def context(self):
        return finance.financial_context(self.plan, FinancialGoal.objects.all())

    def test_includes_precomputed_scenarios(self):
        scenarios = {s["key"]: s for s in self.context()["scenarios"]}
        self.assertEqual(scenarios["current"]["months"], Decimal("3.2"))
        self.assertEqual(scenarios["target"]["monthly_spending"], Decimal("7500.00"))

    def test_includes_goal_progress_already_calculated(self):
        FinancialGoal.objects.create(
            name="Viaje", target_amount=Decimal("30000"),
            current_amount=Decimal("12500"),
        )
        goal = self.context()["goals"][0]
        self.assertEqual(goal["progress"]["percent"], 42)

    def test_daily_and_weekly_guides_are_precomputed(self):
        # If these weren't present, the model would have to divide -- which the
        # prompt forbids, leaving it unable to answer at all.
        target = next(s for s in self.context()["scenarios"] if s["key"] == "target")
        self.assertIn("allowance", target)
        self.assertIn("daily", target["allowance"])
        self.assertIn("weekly", target["allowance"])

    def test_observed_spending_is_none_without_history(self):
        self.assertIsNone(self.context()["observed_spending"])

    def test_category_breakdown_is_ordered_by_size(self):
        today = timezone.localdate()
        Expense.objects.create(amount=Decimal("5000"), currency="MXN",
                               description="Renta", category="housing", date=today)
        Expense.objects.create(amount=Decimal("200"), currency="MXN",
                               description="Café", category="food", date=today)
        breakdown = self.context()["spending_by_category"]
        self.assertEqual(breakdown[0]["category"], "housing")
        self.assertEqual(breakdown[0]["total"], Decimal("5000.00"))

    def test_context_is_json_serializable_without_floats(self):
        payload = json.dumps(finance.to_json(self.context()))
        self.assertIn('"3.2"', payload)          # months as a string
        self.assertIn('"45000.00"', payload)     # money as a string
        self.assertNotIn("45000.0,", payload)    # never a float

    def test_detects_an_empty_situation(self):
        empty = RunwayPlan()
        context = finance.financial_context(empty, [])
        self.assertFalse(finance.has_any_financial_data(context))

    def test_detects_a_populated_situation(self):
        self.assertTrue(finance.has_any_financial_data(self.context()))


class AskEndpointTests(TestCase):
    url = "ask"

    def setUp(self):
        plan = RunwayPlan.load()
        plan.current_savings = Decimal("45000")
        plan.essential_expenses = Decimal("11000")
        plan.other_expenses = Decimal("3000")
        plan.desired_runway_months = 6
        plan.save()

    def post(self, question="¿Cuánto me dura el dinero?"):
        return self.client.post(reverse(self.url),
                                data=json.dumps({"question": question}),
                                content_type="application/json")

    def patched(self, answer="Tus ahorros durarían alrededor de 3.2 meses."):
        return patch("expenses.views.guidance.explain", return_value=answer)

    def test_returns_an_answer(self):
        with self.patched():
            response = self.post()
        self.assertEqual(response.status_code, 200)
        self.assertIn("3.2 meses", response.json()["answer"])

    def test_returns_the_context_it_used(self):
        # The explanation must be auditable: the UI can show the numbers behind it.
        with self.patched():
            data = self.post().json()
        self.assertIn("scenarios", data["context"])
        self.assertEqual(data["source"], "claude")

    def test_claude_receives_computed_numbers_not_raw_records(self):
        with self.patched() as mock:
            self.post()
        _, context = mock.call_args[0]
        scenarios = {s["key"]: s for s in context["scenarios"]}
        # Already computed, as strings -- nothing left to derive.
        self.assertEqual(scenarios["current"]["months"], "3.2")
        self.assertEqual(scenarios["target"]["monthly_spending"], "7500.00")

    def test_claude_never_sees_a_database_handle(self):
        with self.patched() as mock:
            self.post()
        _, context = mock.call_args[0]
        self.assertIsInstance(context, dict)
        self.assertEqual(json.loads(json.dumps(context)), context)  # plain data only

    def test_answer_cannot_change_stored_figures(self):
        with patch("expenses.views.guidance.explain",
                   return_value="Tienes $999,999 y te duran 50 años."):
            self.post()
        # A hallucinated answer changes nothing: the model has no write path.
        self.assertEqual(RunwayPlan.load().current_savings, Decimal("45000"))
        self.assertEqual(Expense.objects.count(), 0)

    def test_no_api_call_when_there_is_nothing_to_explain(self):
        RunwayPlan.objects.all().delete()
        with patch("expenses.views.guidance.explain") as mock:
            response = self.post()
        mock.assert_not_called()
        self.assertEqual(response.json()["source"], "no_data")
        self.assertIn("Todavía no tengo datos", response.json()["answer"])

    def test_empty_question_rejected(self):
        response = self.client.post(reverse(self.url),
                                    data=json.dumps({"question": "   "}),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_overlong_question_rejected(self):
        self.assertEqual(self.post("¿" * 501).status_code, 400)

    def test_failure_returns_502_and_keeps_data_intact(self):
        with patch("expenses.views.guidance.explain",
                   side_effect=ExtractionError("El servicio está saturado.")):
            response = self.post()
        self.assertEqual(response.status_code, 502)
        self.assertIn("saturado", response.json()["detail"])
        self.assertEqual(RunwayPlan.load().current_savings, Decimal("45000"))
