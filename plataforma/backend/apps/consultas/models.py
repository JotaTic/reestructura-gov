"""
Sprint 5 — Consultas obligatorias a organismos externos.

Registra las consultas formales que debe realizar la entidad durante el proceso
de reestructuración (DAFP/Función Pública, MinHacienda, MinTrabajo, CNSC, etc.)
y hace seguimiento a las respuestas recibidas.
"""
from django.db import models

from apps.common.audit import AuditedModel, register_audit_model


class OfficialConsultation(AuditedModel):
    """Consulta oficial enviada a un organismo externo durante el proceso."""

    class EntityTarget(models.TextChoices):
        DAFP = 'DAFP', 'Función Pública'
        MINHACIENDA = 'MINHACIENDA', 'MinHacienda'
        MINTRABAJO = 'MINTRABAJO', 'MinTrabajo'
        CNSC = 'CNSC', 'CNSC'
        CONTRALORIA = 'CONTRALORIA', 'Contraloría'
        PERSONERIA = 'PERSONERIA', 'Personería'
        OTRO = 'OTRO', 'Otro'

    class Result(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        FAVORABLE = 'FAVORABLE', 'Favorable'
        NO_FAVORABLE = 'NO_FAVORABLE', 'No favorable'
        CON_OBSERVACIONES = 'CON_OBSERVACIONES', 'Con observaciones'

    restructuring = models.ForeignKey(
        'core.Restructuring',
        on_delete=models.CASCADE,
        related_name='consultations',
        verbose_name='Reestructuración',
    )
    entity_target = models.CharField(
        'Organismo consultado',
        max_length=16,
        choices=EntityTarget.choices,
    )
    subject = models.CharField('Asunto', max_length=500)
    sent_at = models.DateField('Fecha de envío', null=True, blank=True)
    reference_number = models.CharField('Número de radicado', max_length=100, blank=True)
    response_at = models.DateField('Fecha de respuesta', null=True, blank=True)
    response_result = models.CharField(
        'Resultado de la respuesta',
        max_length=24,
        choices=Result.choices,
        default=Result.PENDIENTE,
    )
    response_document = models.ForeignKey(
        'documentos.Document',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='consultation_responses',
        verbose_name='Documento de respuesta',
    )
    notes = models.TextField('Notas', blank=True)

    class Meta:
        verbose_name = 'Consulta oficial'
        verbose_name_plural = 'Consultas oficiales'
        ordering = ['-sent_at', 'entity_target']
        indexes = [
            models.Index(fields=['restructuring', 'entity_target']),
        ]

    def __str__(self) -> str:
        return f'{self.get_entity_target_display()} — {self.subject[:60]}'


register_audit_model('consultas.OfficialConsultation')


# ---------------------------------------------------------------------------
# Servicio: días hasta expiración
# ---------------------------------------------------------------------------

def days_until_expiration(consultation: OfficialConsultation) -> int | None:
    """
    Calcula cuántos días quedan (o llevamos vencidos) para la respuesta.

    - Si sent_at es None → no aplica (retorna None).
    - Si ya tiene response_at → ya respondieron (retorna None).
    - Expiración DAFP: 30 días naturales desde sent_at.
    - Retorna positivo si aún no vence, negativo si ya venció.
    """
    import datetime
    if consultation.sent_at is None or consultation.response_at is not None:
        return None
    deadline = consultation.sent_at + datetime.timedelta(days=30)
    today = datetime.date.today()
    return (deadline - today).days
