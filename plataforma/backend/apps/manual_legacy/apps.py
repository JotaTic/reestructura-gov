from django.apps import AppConfig


class ManualLegacyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.manual_legacy'
    verbose_name = 'Manual de Funciones Vigente'
