from django.urls import path

from . import views

urlpatterns = [
    path("expenses/", views.ExpenseListCreate.as_view(), name="expense-list"),
    path("expenses/<uuid:pk>/", views.ExpenseDetail.as_view(), name="expense-detail"),
    path("categories/", views.category_list, name="category-list"),
    path("extract/", views.extract, name="extract"),
    path("goals/", views.GoalListCreate.as_view(), name="goal-list"),
    path("goals/<uuid:pk>/", views.GoalDetail.as_view(), name="goal-detail"),
    path("runway/", views.runway_plan, name="runway"),
    path("ask/", views.ask, name="ask"),
]
