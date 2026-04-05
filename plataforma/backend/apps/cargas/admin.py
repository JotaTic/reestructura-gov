from django.contrib import admin
from .models import WorkloadMatrix, WorkloadEntry


@admin.register(WorkloadMatrix)
class WorkloadMatrixAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'reference_date', 'created_at')
    list_filter = ('entity', 'reference_date')
    search_fields = ('name',)


@admin.register(WorkloadEntry)
class WorkloadEntryAdmin(admin.ModelAdmin):
    list_display = (
        'activity', 'department', 'hierarchy_level', 'job_denomination',
        'monthly_frequency', 'standard_time', 'hh_month',
    )
    list_filter = ('matrix', 'department', 'hierarchy_level')
    search_fields = ('activity', 'process', 'job_denomination')
    readonly_fields = ('standard_time', 'hh_month')
