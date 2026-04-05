from django.contrib import admin
from .models import ProtectedEmployee


@admin.register(ProtectedEmployee)
class ProtectedEmployeeAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'entity', 'protection_type', 'active', 'protection_end')
    list_filter = ('entity', 'protection_type', 'active')
    search_fields = ('full_name', 'id_number')
