from django.contrib import admin
from .models import Scenario


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ['name', 'restructuring', 'is_baseline', 'payroll_plan', 'created_at']
    list_filter = ['is_baseline', 'restructuring__entity']
    search_fields = ['name', 'description']
    readonly_fields = ['cached_metrics', 'created_at', 'updated_at']
