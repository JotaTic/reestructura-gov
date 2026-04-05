from django.contrib import admin
from .models import ProcessMap, Process, ValueChainLink


class ProcessInline(admin.TabularInline):
    model = Process
    extra = 0


class ValueChainInline(admin.TabularInline):
    model = ValueChainLink
    extra = 0


@admin.register(ProcessMap)
class ProcessMapAdmin(admin.ModelAdmin):
    list_display = ('name', 'entity', 'kind', 'reference_date')
    list_filter = ('kind', 'entity')
    inlines = [ProcessInline, ValueChainInline]


@admin.register(Process)
class ProcessAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'required', 'executable_by_entity', 'duplicated')
    list_filter = ('type', 'required', 'executable_by_entity', 'duplicated')
