from django.urls import path

from . import views

urlpatterns = [
    path("expenses/", views.ExpenseListCreate.as_view(), name="expense-list"),
    path("expenses/<uuid:pk>/", views.ExpenseDetail.as_view(), name="expense-detail"),
    path("categories/", views.category_list, name="category-list"),
    path("extract/", views.extract, name="extract"),
]
