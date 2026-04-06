"""
Sprint 5 — Participación y Comisión de Personal.

Modelos para el seguimiento de la Comisión de Personal, sus reuniones
y las comunicaciones con organizaciones sindicales durante el proceso.
"""
from django.db import models

from apps.common.audit import AuditedModel, register_audit_model


class PersonnelCommittee(AuditedModel):
    """Comisión de personal de una entidad (Ley 909/2004)."""

    entity = models.ForeignKey(
        'core.Entity',
        on_delete=models.CASCADE,
        related_name='committees',
        verbose_name='Entidad',
    )
    name = models.CharField('Nombre', max_length=255, default='Comisión de Personal')
    members_json = models.JSONField(
        'Miembros',
        default=list,
        blank=True,
        help_text='Lista de objetos {name, role, since}.',
    )

    class Meta:
        verbose_name = 'Comisión de personal'
        verbose_name_plural = 'Comisiones de personal'
        unique_together = [('entity', 'name')]
        ordering = ['entity', 'name']

    def __str__(self) -> str:
        from apps.core.models import Entity  # evitar import circular
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class CommitteeMeeting(AuditedModel):
    """Reunión de la Comisión de Personal."""

    committee = models.ForeignKey(
        PersonnelCommittee,
        on_delete=models.CASCADE,
        related_name='meetings',
        verbose_name='Comisión',
    )
    restructuring = models.ForeignKey(
        'core.Restructuring',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='committee_meetings',
        verbose_name='Reestructuración',
    )
    date = models.DateField('Fecha')
    agenda = models.TextField('Orden del día', blank=True)
    minutes_text = models.TextField('Acta (texto)', blank=True)
    minutes_document = models.ForeignKey(
        'documentos.Document',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='committee_minutes',
        verbose_name='Documento del acta',
    )

    class Meta:
        verbose_name = 'Reunión de comisión'
        verbose_name_plural = 'Reuniones de comisión'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['committee', 'date']),
            models.Index(fields=['restructuring']),
        ]

    def __str__(self) -> str:
        return f'{self.committee.name} — {self.date}'


class UnionCommunication(AuditedModel):
    """Comunicación con una organización sindical durante la reestructuración."""

    restructuring = models.ForeignKey(
        'core.Restructuring',
        on_delete=models.CASCADE,
        related_name='union_communications',
        verbose_name='Reestructuración',
    )
    union_name = models.CharField('Organización sindical', max_length=255)
    sent_at = models.DateField('Fecha de envío')
    subject = models.CharField('Asunto', max_length=500)
    body = models.TextField('Cuerpo del comunicado', blank=True)
    document = models.ForeignKey(
        'documentos.Document',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name='Documento',
    )
    response_received = models.BooleanField('¿Respuesta recibida?', default=False)
    response_notes = models.TextField('Notas de la respuesta', blank=True)

    class Meta:
        verbose_name = 'Comunicación sindical'
        verbose_name_plural = 'Comunicaciones sindicales'
        ordering = ['-sent_at', 'union_name']
        indexes = [
            models.Index(fields=['restructuring', 'sent_at']),
        ]

    def __str__(self) -> str:
        return f'{self.union_name} — {self.subject[:60]}'


register_audit_model('participacion.PersonnelCommittee')
register_audit_model('participacion.CommitteeMeeting')
register_audit_model('participacion.UnionCommunication')
