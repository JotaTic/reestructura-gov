from django.contrib import admin
from .models import Entity, Department, TimelineActivity, Restructuring


@admin.register(Restructuring)
class RestructuringAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'reference_date', 'status')
    list_filter = ('status', 'entity')
    search_fields = ('name', 'code')


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ('name', 'acronym', 'order', 'legal_nature', 'municipality_category')
    list_filter = ('order', 'legal_nature', 'municipality_category')
    search_fields = ('name', 'acronym', 'nit')
    fieldsets = (
        ('Identificación', {
            'fields': ('name', 'acronym', 'nit', 'order', 'municipality_category',
                       'legal_nature', 'creation_norm'),
        }),
        ('Insumos vigentes (num. 1.1)', {
            'fields': ('current_structure_act', 'current_payroll_act', 'current_manual_act'),
        }),
        ('Acuerdo inicial — cuatro interrogantes (num. 1.2)', {
            'fields': ('problem_statement', 'objectives', 'approach', 'risks'),
        }),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'code', 'parent', 'order')
    list_filter = ('entity',)
    search_fields = ('name', 'code')


@admin.register(TimelineActivity)
class TimelineActivityAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'responsible', 'start_date', 'end_date', 'status')
    list_filter = ('entity', 'status')
    search_fields = ('name', 'responsible', 'indicator')
