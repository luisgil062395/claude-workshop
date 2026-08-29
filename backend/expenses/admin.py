from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ["date", "description", "amount", "currency", "category", "input_method"]
    list_filter = ["category", "input_method", "date"]
    search_fields = ["description", "raw_input"]
