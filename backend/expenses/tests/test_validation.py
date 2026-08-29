"""The validation gate, exercised directly.

These rules protect every write path -- manual form, voice extraction and any
future receipt upload -- so they are tested once, here.
"""

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from expenses.categories import normalize
from expenses.serializers import ExpenseSerializer


def valid_payload(**overrides):
    return {
        "amount": "180.00",
        "currency": "MXN",
        "description": "Costco",
        "category": "groceries",
        "date": timezone.localdate().isoformat(),
        "input_method": "text",
        **overrides,
    }


class CategoryNormalizationTests(TestCase):
    def test_accepts_canonical_slug(self):
        self.assertEqual(normalize("groceries"), "groceries")

    def test_accepts_spanish_label(self):
        self.assertEqual(normalize("Supermercado"), "groceries")

    def test_accepts_title_case_english(self):
        # The shape Claude most often returns.
        self.assertEqual(normalize("Groceries"), "groceries")

    def test_rejects_unknown(self):
        self.assertIsNone(normalize("cripto"))

    def test_rejects_empty(self):
        self.assertIsNone(normalize(""))
        self.assertIsNone(normalize(None))


class ExpenseSerializerTests(TestCase):
    def test_accepts_valid_payload(self):
        serializer = ExpenseSerializer(data=valid_payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_normalizes_category_currency_and_description(self):
        serializer = ExpenseSerializer(
            data=valid_payload(
                category="Supermercado", currency="mxn", description="  Costco  "
            )
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["category"], "groceries")
        self.assertEqual(serializer.validated_data["currency"], "MXN")
        self.assertEqual(serializer.validated_data["description"], "Costco")

    def test_amount_is_decimal_not_float(self):
        serializer = ExpenseSerializer(data=valid_payload(amount="0.10"))
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["amount"], Decimal("0.10"))

    def test_rejects_zero_and_negative_amounts(self):
        for amount in ("0", "-5"):
            with self.subTest(amount=amount):
                serializer = ExpenseSerializer(data=valid_payload(amount=amount))
                self.assertFalse(serializer.is_valid())
                self.assertIn("amount", serializer.errors)

    def test_rejects_future_date(self):
        future = (timezone.localdate() + timedelta(days=30)).isoformat()
        serializer = ExpenseSerializer(data=valid_payload(date=future))
        self.assertFalse(serializer.is_valid())
        self.assertIn("date", serializer.errors)

    def test_allows_yesterday(self):
        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        serializer = ExpenseSerializer(data=valid_payload(date=yesterday))
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_unknown_category(self):
        serializer = ExpenseSerializer(data=valid_payload(category="cripto"))
        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_rejects_blank_description(self):
        serializer = ExpenseSerializer(data=valid_payload(description="   "))
        self.assertFalse(serializer.is_valid())
        self.assertIn("description", serializer.errors)

    def test_rejects_bad_currency_code(self):
        serializer = ExpenseSerializer(data=valid_payload(currency="pesos"))
        self.assertFalse(serializer.is_valid())
        self.assertIn("currency", serializer.errors)
