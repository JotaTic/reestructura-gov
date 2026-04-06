"""
Auditoría y modelo base con trazabilidad.

Provee:
- `AuditedModel`: mixin abstracto con created_at/created_by/updated_at/updated_by.
  Cualquier modelo nuevo (salvo catálogos maestros) debe heredarlo.
- `AuditedSerializerMixin`: setea created_by/updated_by desde request.user.
- `AUDIT_MODELS`: registry (label "app.Model") de los modelos cuya escritura debe
  registrarse en `common.ChangeLog` vía signals.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

# Registry de modelos auditados (ver apps.common.signals).
# Se rellena desde cada app con register_audit_model("app.Model") al iniciar.
AUDIT_MODELS: set[str] = set()


def register_audit_model(label: str) -> None:
    """Marca un modelo ("app_label.ModelName") como auditado por ChangeLog."""
    AUDIT_MODELS.add(label)


class AuditedModel(models.Model):
    """Mixin abstracto con trazabilidad básica.

    No declara índices sobre los FK nulos de usuario para no obligar a migraciones
    costosas en cada heredero; quien quiera indexar created_by puede hacerlo
    explícitamente.
    """

    created_at = models.DateTimeField('Creado en', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado en', auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='Creado por',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='Actualizado por',
    )

    class Meta:
        abstract = True


class AuditedSerializerMixin:
    """Serializer mixin que inyecta created_by/updated_by desde request.user.

    Se aplica sobre serializers de modelos que heredan `AuditedModel`.
    Si el serializer no se usa dentro de un request autenticado, es un no-op.
    """

    def _current_user(self):
        request = self.context.get('request') if hasattr(self, 'context') else None
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            return request.user
        return None

    def create(self, validated_data):
        user = self._current_user()
        if user is not None:
            validated_data.setdefault('created_by', user)
            validated_data.setdefault('updated_by', user)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = self._current_user()
        if user is not None:
            validated_data['updated_by'] = user
        return super().update(instance, validated_data)
