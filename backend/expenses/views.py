from rest_framework import generics

from .categories import Category
from .models import Expense
from .serializers import ExpenseSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view


class ExpenseListCreate(generics.ListCreateAPIView):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer


class ExpenseDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer


@api_view(["GET"])
def category_list(request):
    """The category vocabulary, so the frontend never hardcodes its own copy."""
    return Response(
        [{"value": c.value, "label": c.label} for c in Category]
    )
