from django.contrib import admin
from .models import PayrollPlan, PayrollPosition


class PayrollPositionInline(admin.TabularInline):
    model = PayrollPosition
    extra = 0


@admin.register(PayrollPlan)
class PayrollPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'kind', 'structure', 'reference_date')
    list_filter = ('kind', 'structure', 'entity')
    search_fields = ('name',)
    inlines = [PayrollPositionInline]


@admin.register(PayrollPosition)
class PayrollPositionAdmin(admin.ModelAdmin):
    list_display = ('denomination', 'code', 'grade', 'hierarchy_level', 'quantity', 'plan')
    list_filter = ('plan__entity', 'plan__kind', 'hierarchy_level')
    search_fields = ('denomination', 'code')
