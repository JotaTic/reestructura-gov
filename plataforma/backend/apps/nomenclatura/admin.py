from django.contrib import admin
from .models import JobNomenclature


@admin.register(JobNomenclature)
class JobNomenclatureAdmin(admin.ModelAdmin):
    list_display = ('code', 'denomination', 'level', 'scope')
    list_filter = ('scope', 'level')
    search_fields = ('code', 'denomination')
