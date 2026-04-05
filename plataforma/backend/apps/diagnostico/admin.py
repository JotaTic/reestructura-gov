from django.contrib import admin
from .models import Diagnosis, SwotItem, LegalReference, EnvironmentAnalysis


class SwotInline(admin.TabularInline):
    model = SwotItem
    extra = 0


class LegalInline(admin.TabularInline):
    model = LegalReference
    extra = 0


class EnvironmentInline(admin.TabularInline):
    model = EnvironmentAnalysis
    extra = 0


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'reference_date')
    list_filter = ('entity',)
    search_fields = ('name',)
    inlines = [SwotInline, LegalInline, EnvironmentInline]
