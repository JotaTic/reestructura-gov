from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.common'

    def ready(self):  # noqa: D401
        # Importa signals para conectarlos al arrancar.
        from . import signals  # noqa: F401
        # Registra los modelos auditados desde el inicio. Otras apps pueden
        # llamar a `register_audit_model` en su propio ready() para añadirse.
        from .audit import register_audit_model
        for label in (
            'core.Entity',
            'core.Restructuring',
            'core.Department',
            'core.UserEntityAccess',
            'core.GroupModelPermission',
            'auth.User',
            # Sprint 1
            'core.RestructuringObjective',
            'talento.Employee',
            'talento.EmploymentRecord',
            # Sprint 2
            'mfmp.MFMP',
            'mfmp.MFMPScenario',
            # Sprint 3
            'manual_legacy.LegacyManual',
            'procedimientos.Procedure',
            'mandatos.LegalMandate',
            'documentos.Document',
        ):
            register_audit_model(label)
        # Sprint 4 — registrar reglas de validación declarativas
        import apps.common.rules  # noqa: F401
