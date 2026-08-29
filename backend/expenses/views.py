from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ai.client import ExtractionError
from ai.extraction import extract_expense

from .categories import Category, InputMethod
from .models import Expense
from .serializers import ExpenseSerializer

# Fields the model may propose. input_method and raw_input are set by the
# server from the request, never by the model.
EXTRACTABLE_FIELDS = ("amount", "currency", "description", "category", "date")

# Without these a draft cannot be saved, so the UI needs to know they are absent.
REQUIRED_FIELDS = ("amount", "description", "category", "date")


class ExpenseListCreate(generics.ListCreateAPIView):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer


class ExpenseDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer


@api_view(["GET"])
def category_list(request):
    """The category vocabulary, so the frontend never hardcodes its own copy."""
    return Response([{"value": c.value, "label": c.label} for c in Category])


@api_view(["POST"])
def extract(request):
    """Interpret natural language into an UNSAVED expense draft.

    This view never creates an Expense. It runs the model's output through the
    same ExpenseSerializer the manual form uses, and returns validated_data.
    Persisting is still POST /api/expenses/, chosen explicitly by the user.
    """
    text = (request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"detail": "No se recibió texto para interpretar."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    input_method = request.data.get("input_method") or InputMethod.TEXT
    if input_method not in InputMethod.values:
        return Response(
            {"detail": f"Método de entrada inválido: {input_method!r}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        candidate = extract_expense(
            text,
            today=timezone.localdate(),      # user's today, per TIME_ZONE
            timezone_name=settings.TIME_ZONE,
        )
    except ExtractionError as error:
        # 502: the failure is upstream, not in the client's request. The
        # frontend keeps the transcript and the form untouched.
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

    notes = candidate.get("notes")
    draft, rejected = _validate_draft(candidate, input_method, text)

    missing = [f for f in REQUIRED_FIELDS if f not in draft]
    return Response({**draft, "missing_fields": missing, "notes": notes})


def _validate_draft(candidate, input_method, text):
    """Normalize candidate fields through ExpenseSerializer without saving.

    partial=True is the key: a draft with an undetermined amount is a valid
    draft (the user fills it in), while a draft with a nonsense amount is not.
    Fields the serializer rejects are dropped and reported as missing rather
    than failing the whole extraction -- a partial draft still saves the user
    most of the typing.
    """
    data = {
        field: candidate[field]
        for field in EXTRACTABLE_FIELDS
        if candidate.get(field) not in (None, "")
    }
    data["input_method"] = input_method
    data["raw_input"] = text

    rejected = []
    # Each pass drops the fields that failed. Terminates because the two
    # server-set fields are always valid, so the candidate set only shrinks.
    for _ in range(len(EXTRACTABLE_FIELDS) + 1):
        serializer = ExpenseSerializer(data=data, partial=True)
        if serializer.is_valid():
            return _to_json(serializer.validated_data), rejected
        for field in serializer.errors:
            data.pop(field, None)
            rejected.append(field)

    return {"input_method": input_method, "raw_input": text}, rejected


def _to_json(validated):
    """Render validated values using the serializer's own field representations.

    So a draft's amount looks exactly like a saved expense's amount ("180.00",
    not 180.0) and the frontend can treat both identically.
    """
    fields = ExpenseSerializer().fields
    return {name: fields[name].to_representation(value) for name, value in validated.items()}
