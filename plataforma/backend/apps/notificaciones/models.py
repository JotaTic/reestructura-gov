"""
Sprint 6 — Modelo de Notificaciones per-user.

Las notificaciones se crean desde servicios backend (workflow, documentos,
consultas) y son leídas desde el frontend vía API.
"""
from django.conf import settings
from django.db import models

from apps.common.audit import AuditedModel


class Notification(AuditedModel):
    """Notificación de sistema para un usuario específico."""

    class Kind(models.TextChoices):
        TRANSITION = 'TRANSITION', 'Transición de estado'
        VALIDATION_ERROR = 'VALIDATION_ERROR', 'Validación en rojo'
        CONSULTATION_DUE = 'CONSULTATION_DUE', 'Consulta por vencer'
        DOCUMENT_NEW = 'DOCUMENT_NEW', 'Documento nuevo'
        ASSIGNMENT = 'ASSIGNMENT', 'Tarea asignada'
        SYSTEM = 'SYSTEM', 'Sistema'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Usuario',
    )
    kind = models.CharField('Tipo', max_length=24, choices=Kind.choices)
    entity = models.ForeignKey(
        'core.Entity',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications',
        verbose_name='Entidad',
    )
    restructuring = models.ForeignKey(
        'core.Restructuring',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications',
        verbose_name='Reestructuración',
    )
    message = models.CharField('Mensaje', max_length=500)
    link = models.CharField('Ruta frontend', max_length=255, blank=True,
                            help_text='Ruta relativa del frontend (ej. /reestructuraciones/1/gobierno).')
    read = models.BooleanField('Leída', default=False)

    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'read']),
        ]

    def __str__(self) -> str:
        read_flag = '' if self.read else ' [no leída]'
        return f'{self.user_id} — {self.get_kind_display()}: {self.message[:60]}{read_flag}'
