from django.contrib import admin
from .models import FiscalYear


@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = ('entity', 'year', 'law_617_ratio', 'law_617_compliant')
    list_filter = ('entity', 'year')
