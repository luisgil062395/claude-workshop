"""The extraction boundary.

Claude is mocked here -- these tests assert what the application does with a
model response, which is the part that must never go wrong. Real API calls
happen only in the running application, never in the test suite.
"""

import json
from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from ai.client import ExtractionError
from ai.extraction import _parse
from expenses.models import Expense


class FakeBlock:
    type = "text"

    def __init__(self, text):
        self.text = text


class FakeResponse:
    def __init__(self, payload):
        self.content = [FakeBlock(json.dumps(payload))]


def model_output(**overrides):
    """A well-formed Claude response for 'Ayer gasté 180 pesos en Costco'."""
    return {
        "amount": "180.00",
        "currency": "MXN",
        "description": "Costco",
        "category": "groceries",
        "date": (timezone.localdate() - timedelta(days=1)).isoformat(),
        "notes": None,
        **overrides,
    }


class ParseTests(TestCase):
    """_parse is the thin layer between the SDK and our own data."""

    def test_extracts_expected_fields(self):
        parsed = _parse(FakeResponse(model_output()))
        self.assertEqual(parsed["amount"], "180.00")
        self.assertEqual(parsed["category"], "groceries")

    def test_drops_unexpected_keys(self):
        # A key we never asked for must not reach the serializer.
        parsed = _parse(FakeResponse(model_output(evil="DROP TABLE expenses")))
        self.assertNotIn("evil", parsed)

    def test_missing_keys_become_none(self):
        parsed = _parse(FakeResponse({"amount": "10.00"}))
        self.assertIsNone(parsed["description"])

    def test_malformed_json_raises_extraction_error(self):
        response = FakeResponse({})
        response.content = [FakeBlock("no soy json")]
        with self.assertRaises(ExtractionError):
            _parse(response)

    def test_non_object_json_raises_extraction_error(self):
        response = FakeResponse({})
        response.content = [FakeBlock('["a", "b"]')]
        with self.assertRaises(ExtractionError):
            _parse(response)

    def test_empty_content_raises_extraction_error(self):
        response = FakeResponse({})
        response.content = []
        with self.assertRaises(ExtractionError):
            _parse(response)


class ExtractEndpointTests(TestCase):
    url_name = "extract"

    def post(self, **body):
        return self.client.post(
            reverse(self.url_name), data=body, content_type="application/json"
        )

    def patched(self, **overrides):
        return patch(
            "expenses.views.extract_expense", return_value=model_output(**overrides)
        )

    # --- the rule that matters most ---------------------------------------

    def test_never_creates_an_expense(self):
        with self.patched():
            response = self.post(text="Ayer gasté 180 pesos en Costco", input_method="voice")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Expense.objects.count(), 0)

    def test_response_contains_no_id(self):
        # An id would imply something was persisted.
        with self.patched():
            response = self.post(text="Ayer gasté 180 en Costco", input_method="voice")
        self.assertNotIn("id", response.json())

    # --- normalization through the shared serializer -----------------------

    def test_returns_normalized_draft(self):
        with self.patched():
            response = self.post(text="Ayer gasté 180 pesos en Costco", input_method="voice")
        draft = response.json()
        self.assertEqual(draft["amount"], "180.00")
        self.assertEqual(draft["currency"], "MXN")
        self.assertEqual(draft["description"], "Costco")
        self.assertEqual(draft["category"], "groceries")
        self.assertEqual(draft["input_method"], "voice")
        self.assertEqual(draft["missing_fields"], [])

    def test_raw_input_preserves_the_transcript(self):
        transcript = "Ayer gasté 180 pesos en Costco en el súper."
        with self.patched():
            response = self.post(text=transcript, input_method="voice")
        self.assertEqual(response.json()["raw_input"], transcript)

    def test_input_method_comes_from_request_not_from_model(self):
        # Even if the model tried to set it, the server's value wins.
        with self.patched(input_method="receipt"):
            response = self.post(text="Café 50 pesos", input_method="voice")
        self.assertEqual(response.json()["input_method"], "voice")

    def test_english_category_slug_is_normalized(self):
        with self.patched(category="Groceries"):
            response = self.post(text="Costco 180", input_method="voice")
        self.assertEqual(response.json()["category"], "groceries")

    def test_amount_is_a_decimal_string_not_a_float(self):
        with self.patched(amount="0.10"):
            response = self.post(text="Un peso diez", input_method="voice")
        self.assertEqual(response.json()["amount"], "0.10")

    # --- uncertainty rather than invention ---------------------------------

    def test_null_amount_is_reported_as_missing(self):
        with self.patched(amount=None):
            response = self.post(text="Fui a Costco", input_method="voice")
        draft = response.json()
        self.assertNotIn("amount", draft)
        self.assertIn("amount", draft["missing_fields"])
        # The fields it did determine still come back.
        self.assertEqual(draft["description"], "Costco")

    def test_rejected_field_is_dropped_not_fatal(self):
        # The serializer is the gate: a category the model invented is discarded
        # and reported, while the rest of the draft survives.
        with self.patched(category="cripto"):
            response = self.post(text="Compré algo raro", input_method="voice")
        draft = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("category", draft)
        self.assertIn("category", draft["missing_fields"])
        self.assertEqual(draft["amount"], "180.00")

    def test_future_date_is_rejected_by_the_serializer(self):
        future = (timezone.localdate() + timedelta(days=365)).isoformat()
        with self.patched(date=future):
            response = self.post(text="Gasto raro", input_method="voice")
        draft = response.json()
        self.assertNotIn("date", draft)
        self.assertIn("date", draft["missing_fields"])

    def test_everything_missing_still_returns_200(self):
        with self.patched(
            amount=None, currency=None, description=None, category=None, date=None
        ):
            response = self.post(text="mmm", input_method="voice")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            sorted(response.json()["missing_fields"]),
            ["amount", "category", "date", "description"],
        )

    def test_notes_are_passed_through(self):
        with self.patched(notes="No quedó claro si incluye propina."):
            response = self.post(text="Comida 300", input_method="voice")
        self.assertEqual(response.json()["notes"], "No quedó claro si incluye propina.")

    # --- request and upstream errors ---------------------------------------

    def test_empty_text_is_rejected(self):
        response = self.post(text="   ", input_method="voice")
        self.assertEqual(response.status_code, 400)

    def test_invalid_input_method_is_rejected(self):
        response = self.post(text="Café 50", input_method="telepatía")
        self.assertEqual(response.status_code, 400)

    def test_extraction_failure_returns_502_with_a_message(self):
        with patch(
            "expenses.views.extract_expense",
            side_effect=ExtractionError("El servidor no tiene configurada ANTHROPIC_API_KEY."),
        ):
            response = self.post(text="Café 50 pesos", input_method="voice")
        self.assertEqual(response.status_code, 502)
        self.assertIn("ANTHROPIC_API_KEY", response.json()["detail"])
        self.assertEqual(Expense.objects.count(), 0)


class VoiceSaveTests(TestCase):
    """The save path is the existing one -- voice adds no second pipeline."""

    def test_draft_can_be_saved_through_the_normal_endpoint(self):
        transcript = "Ayer gasté 180 pesos en Costco en el súper."
        with patch("expenses.views.extract_expense", return_value=model_output()):
            draft = self.client.post(
                reverse("extract"),
                data={"text": transcript, "input_method": "voice"},
                content_type="application/json",
            ).json()

        self.assertEqual(Expense.objects.count(), 0)  # still nothing saved

        draft.pop("missing_fields")
        draft.pop("notes")
        saved = self.client.post(
            reverse("expense-list"), data=draft, content_type="application/json"
        )

        self.assertEqual(saved.status_code, 201)
        expense = Expense.objects.get()
        self.assertEqual(expense.input_method, "voice")
        self.assertEqual(expense.raw_input, transcript)
        self.assertEqual(str(expense.amount), "180.00")
        self.assertEqual(expense.date, timezone.localdate() - timedelta(days=1))

    def test_user_edits_override_the_draft(self):
        with patch("expenses.views.extract_expense", return_value=model_output()):
            draft = self.client.post(
                reverse("extract"),
                data={"text": "Ayer gasté 180 en Costco", "input_method": "voice"},
                content_type="application/json",
            ).json()

        draft.pop("missing_fields")
        draft.pop("notes")
        draft["amount"] = "195.50"          # the user corrects the amount
        draft["description"] = "Costco Polanco"

        self.client.post(reverse("expense-list"), data=draft, content_type="application/json")

        expense = Expense.objects.get()
        self.assertEqual(str(expense.amount), "195.50")
        self.assertEqual(expense.description, "Costco Polanco")
        self.assertEqual(expense.input_method, "voice")  # provenance preserved
