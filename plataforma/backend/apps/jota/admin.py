from django.contrib import admin
from django.contrib import messages
from .models import JotaIntent, JotaSettings


class SuperuserOnlyMixin:
    """Restringe toda la interacción con estos modelos a superusuarios."""

    def has_module_permission(self, request):
        return bool(request.user and request.user.is_superuser)

    def has_view_permission(self, request, obj=None):
        return bool(request.user and request.user.is_superuser)

    def has_add_permission(self, request):
        return bool(request.user and request.user.is_superuser)

    def has_change_permission(self, request, obj=None):
        return bool(request.user and request.user.is_superuser)

    def has_delete_permission(self, request, obj=None):
        return bool(request.user and request.user.is_superuser)


@admin.register(JotaIntent)
class JotaIntentAdmin(SuperuserOnlyMixin, admin.ModelAdmin):
    list_display = ('name', 'category', 'priority', 'is_active', 'updated_at')
    list_filter = ('is_active', 'category')
    search_fields = ('name', 'slug', 'keywords', 'answer')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('priority', 'is_active')
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'category', 'is_active', 'priority'),
        }),
        ('Contenido', {
            'fields': ('keywords', 'answer'),
            'description': 'Palabras clave separadas por comas o líneas. '
                           'Respuesta admite markdown ligero.',
        }),
    )
    actions = ['activate_intents', 'deactivate_intents']

    def activate_intents(self, request, queryset):
        n = queryset.update(is_active=True)
        self.message_user(request, f'{n} intenciones activadas.', messages.SUCCESS)
    activate_intents.short_description = 'Activar intenciones seleccionadas'

    def deactivate_intents(self, request, queryset):
        n = queryset.update(is_active=False)
        self.message_user(request, f'{n} intenciones desactivadas.', messages.SUCCESS)
    deactivate_intents.short_description = 'Desactivar intenciones seleccionadas'


@admin.register(JotaSettings)
class JotaSettingsAdmin(SuperuserOnlyMixin, admin.ModelAdmin):
    list_display = ('bot_name', 'is_enabled', 'position', 'updated_at')

    def has_add_permission(self, request):
        # Singleton: solo si no existe uno aún.
        if not super().has_add_permission(request):
            return False
        return not JotaSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # No permitir borrar el singleton.
        return False
