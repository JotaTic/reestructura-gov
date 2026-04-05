from django.contrib import admin
from .models import LegalNorm


@admin.register(LegalNorm)
class LegalNormAdmin(admin.ModelAdmin):
    list_display = ('reference', 'title', 'kind', 'year')
    list_filter = ('kind', 'year')
    search_fields = ('reference', 'title', 'summary')
