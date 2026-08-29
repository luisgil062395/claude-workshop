from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ai.client import ExtractionError
from ai.extraction import extract_expense
from ai import guidance

from . import finance
from .categories import Category, InputMethod, is_essential
from .models import Expense, FinancialGoal, RunwayPlan
from .serializers import ExpenseSerializer, FinancialGoalSerializer, RunwayPlanSerializer

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


class GoalListCreate(generics.ListCreateAPIView):
    queryset = FinancialGoal.objects.all()
    serializer_class = FinancialGoalSerializer


class GoalDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = FinancialGoal.objects.all()
    serializer_class = FinancialGoalSerializer


@api_view(["GET", "PUT"])
def runway_plan(request):
    """The user's financial situation, plus everything derived from it.

    GET returns the stored inputs alongside observed spending, the runway and
    the scenarios -- all computed in finance.py on every request, never stored.
    A cached percentage is a percentage that can go stale.
    """
    plan = RunwayPlan.load()

    if request.method == "PUT":
        serializer = RunwayPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save()

    overrides = plan.essential_overrides or {}
    observed = finance.observed_monthly_spending(overrides=overrides)

    return Response({
        "plan": RunwayPlanSerializer(plan).data,
        # None when there isn't enough history. The UI must say so rather than
        # showing a number SUMA can't stand behind.
        "observed_spending": finance.to_json(observed),
        "scenarios": finance.to_json(finance.scenarios(plan, observed)),
        "categories": [
            {
                "value": c.value,
                "label": c.label,
                "essential": is_essential(c.value, overrides),
                "overridden": c.value in overrides,
            }
            for c in Category
        ],
    })


@api_view(["POST"])
def ask(request):
    """Answer a financial question using only numbers computed in Python.

    Django gathers the data and calculates everything first; Claude receives
    the finished figures and turns them into a sentence. It cannot reach the
    database, and it is told in the prompt that it must not do arithmetic.

    The computed context travels back with the answer so the UI can show what
    the response was based on -- the explanation is auditable, not a black box.
    """
    question = (request.data.get("question") or "").strip()
    if not question:
        return Response(
            {"detail": "Escribe una pregunta."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(question) > 500:
        return Response(
            {"detail": "La pregunta es demasiado larga."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    plan = RunwayPlan.load()
    goals = FinancialGoal.objects.all()
    context = finance.financial_context(plan, goals)

    # With nothing recorded there is nothing to explain. Answering here would
    # spend an API call and invite the model to fill the silence.
    if not finance.has_any_financial_data(context):
        return Response({
            "answer": (
                "Todavía no tengo datos tuyos para responder eso. "
                "Registra un gasto o cuéntame cuánto tienes disponible y con gusto "
                "te ayudo."
            ),
            "context": finance.to_json(context),
            "source": "no_data",
        })

    try:
        answer = guidance.explain(question, finance.to_json(context))
    except ExtractionError as error:
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({
        "answer": answer,
        "context": finance.to_json(context),
        "source": "claude",
    })
