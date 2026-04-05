from django.contrib import admin
from .models import ActTemplate, ActDraft


@admin.register(ActTemplate)
class ActTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'scope', 'topic', 'is_active')
    list_filter = ('kind', 'scope', 'topic', 'is_active')
    search_fields = ('name', 'description')


@admin.register(ActDraft)
class ActDraftAdmin(admin.ModelAdmin):
    list_display = ('title', 'entity', 'kind', 'topic', 'status', 'issue_date')
    list_filter = ('kind', 'topic', 'status', 'entity')
    search_fields = ('title', 'act_number')
