from django.contrib import admin

from .models import Expense, FinancialGoal, RunwayPlan


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["date", "description", "amount", "currency", "category", "input_method"]
    list_filter = ["category", "input_method", "date"]
    search_fields = ["description", "raw_input"]


admin.site.register(FinancialGoal)
admin.site.register(RunwayPlan)
