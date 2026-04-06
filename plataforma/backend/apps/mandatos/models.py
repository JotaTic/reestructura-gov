"""
Módulo 18 — Mandatos Legales.

Permite registrar las funciones mandatadas por norma a la entidad y verificar
qué procesos cubren cada mandato (cumplimiento normativo).
"""
from __future__ import annotations

from django.db import models

from apps.common.audit import AuditedModel


class MandateKind(models.TextChoices):
    EJECUCION = 'EJECUCION', 'Ejecución'
    REGULACION = 'REGULACION', 'Regulación'
    VIGILANCIA = 'VIGILANCIA', 'Vigilancia'
    FOMENTO = 'FOMENTO', 'Fomento'
    OTRO = 'OTRO', 'Otro'


class CoverageLevel(models.TextChoices):
    FULL = 'FULL', 'Plena'
    PARTIAL = 'PARTIAL', 'Parcial'
    NONE = 'NONE', 'Ninguna'


class LegalMandate(AuditedModel):
    """Un mandato legal asignado a la entidad por norma."""

    entity = models.ForeignKey(
        'core.Entity',
        on_delete=models.CASCADE,
        related_name='legal_mandates',
        verbose_name='Entidad',
    )
    norm = models.CharField('Norma', max_length=255)
    article = models.CharField('Artículo', max_length=64, blank=True)
    mandate_text = models.TextField('Texto del mandato')
    kind = models.CharField('Tipo', max_length=16, choices=MandateKind.choices)
    is_constitutional = models.BooleanField('¿Es constitucional?', default=False)
    assigned_to_department = models.ForeignKey(
        'core.Department',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='mandates',
        verbose_name='Dependencia responsable',
    )

    class Meta:
        verbose_name = 'Mandato legal'
        verbose_name_plural = 'Mandatos legales'
        indexes = [
            models.Index(fields=['entity', 'kind']),
            models.Index(fields=['norm']),
        ]
        ordering = ['entity', 'norm', 'article']

    def __str__(self) -> str:
        return f'{self.norm} art. {self.article} — {self.kind}'


class MandateCompliance(AuditedModel):
    """Vínculo entre un mandato legal y el proceso que lo cumple."""

    mandate = models.ForeignKey(
        LegalMandate,
        on_delete=models.CASCADE,
        related_name='compliances',
        verbose_name='Mandato',
    )
    process = models.ForeignKey(
        'procesos.Process',
        on_delete=models.CASCADE,
        related_name='mandate_compliances',
        verbose_name='Proceso',
    )
    coverage = models.CharField('Cobertura', max_length=8, choices=CoverageLevel.choices)
    notes = models.TextField('Notas', blank=True)

    class Meta:
        verbose_name = 'Cumplimiento de mandato'
        verbose_name_plural = 'Cumplimientos de mandatos'
        unique_together = [('mandate', 'process')]
        indexes = [
            models.Index(fields=['mandate']),
            models.Index(fields=['process']),
        ]

    def __str__(self) -> str:
        return f'{self.mandate} ← {self.process} ({self.coverage})'
