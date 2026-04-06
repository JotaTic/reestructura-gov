"""
Módulo 8+ — Manual de Procedimientos.

Cada proceso del mapa puede tener uno o varios procedimientos.
Cada procedimiento tiene pasos con tiempos estimados que alimentan la matriz de cargas.
"""
from __future__ import annotations

from django.db import models

from apps.common.audit import AuditedModel


class Procedure(AuditedModel):
    """Procedimiento asociado a un proceso del mapa."""

    process = models.ForeignKey(
        'procesos.Process',
        on_delete=models.CASCADE,
        related_name='procedures',
        verbose_name='Proceso',
    )
    kind = models.CharField(
        'Tipo', max_length=10,
        choices=[('CURRENT', 'Vigente'), ('PROPOSED', 'Propuesto')],
        default='CURRENT',
    )
    code = models.CharField('Código', max_length=32)
    name = models.CharField('Nombre', max_length=255)
    version = models.CharField('Versión', max_length=32, default='1.0')
    objective = models.TextField('Objetivo', blank=True)
    scope = models.TextField('Alcance', blank=True)
    inputs_text = models.TextField('Entradas', blank=True)
    outputs_text = models.TextField('Salidas', blank=True)
    last_updated = models.DateField('Última actualización', null=True, blank=True)

    class Meta:
        verbose_name = 'Procedimiento'
        verbose_name_plural = 'Procedimientos'
        unique_together = [('process', 'code', 'version')]
        indexes = [
            models.Index(fields=['process']),
            models.Index(fields=['code']),
        ]
        ordering = ['process', 'code', 'version']

    def __str__(self) -> str:
        return f'{self.code} {self.name} v{self.version}'


class ProcedureStep(AuditedModel):
    """Un paso dentro de un procedimiento."""

    procedure = models.ForeignKey(
        Procedure,
        on_delete=models.CASCADE,
        related_name='steps',
        verbose_name='Procedimiento',
    )
    order = models.PositiveIntegerField('Orden', default=0)
    description = models.TextField('Descripción')
    role_executor = models.CharField('Cargo ejecutor', max_length=255, blank=True)
    estimated_minutes = models.PositiveIntegerField('Minutos estimados', default=0)
    monthly_volume = models.PositiveIntegerField('Volumen mensual', default=0)
    input_document = models.CharField('Documento de entrada', max_length=255, blank=True)
    output_document = models.CharField('Documento de salida', max_length=255, blank=True)
    supporting_system = models.CharField('Sistema de apoyo', max_length=255, blank=True)

    class Meta:
        verbose_name = 'Paso de procedimiento'
        verbose_name_plural = 'Pasos de procedimiento'
        ordering = ['procedure', 'order']
        indexes = [models.Index(fields=['procedure', 'order'])]

    def __str__(self) -> str:
        return f'{self.procedure.code} · Paso {self.order}'
