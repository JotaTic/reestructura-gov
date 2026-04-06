"""
Modelos globales de la app `common`.

Por ahora solo `ChangeLog` (historial de cambios JSON-diff). Se llena
automáticamente vía signals (ver `apps.common.signals`) para los modelos
marcados en `apps.common.audit.AUDIT_MODELS`.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models


class ChangeLog(models.Model):
    """Registro inmutable de cambios sobre modelos auditados.

    `before_json` / `after_json` guardan un snapshot de los campos del modelo
    (solo campos simples, FKs se guardan como id). No se intenta diff
    recursivo: basta con el snapshot para reconstruir historia.
    """

    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Creación'
        UPDATE = 'UPDATE', 'Actualización'
        DELETE = 'DELETE', 'Eliminación'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='change_logs',
    )
    entity = models.ForeignKey(
        'core.Entity', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='change_logs',
    )
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    object_id = models.CharField(max_length=64)
    action = models.CharField(max_length=8, choices=Action.choices)
    before_json = models.JSONField(null=True, blank=True)
    after_json = models.JSONField(null=True, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Registro de cambio'
        verbose_name_plural = 'Historial de cambios'
        ordering = ['-at']
        indexes = [
            models.Index(fields=['app_label', 'model']),
            models.Index(fields=['entity', '-at']),
            models.Index(fields=['user', '-at']),
            models.Index(fields=['object_id']),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f'{self.at:%Y-%m-%d %H:%M} {self.action} {self.app_label}.{self.model}#{self.object_id}'
