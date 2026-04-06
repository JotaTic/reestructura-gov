"""
Sprint 6 — Simulador de escenarios de reestructuración.

Permite clonar planes de personal, evaluar métricas y comparar escenarios.
"""
from django.db import models

from apps.common.audit import AuditedModel


class Scenario(AuditedModel):
    """
    Escenario de reestructuración: una variante del plan de personal
    asociada a un expediente de reestructuración.

    Puede clonarse desde otro escenario (campo parent) para análisis de
    sensibilidad o comparación de alternativas.
    """

    restructuring = models.ForeignKey(
        'core.Restructuring',
        on_delete=models.CASCADE,
        related_name='scenarios',
        verbose_name='Reestructuración',
    )
    name = models.CharField('Nombre', max_length=255)
    description = models.TextField('Descripción', blank=True)
    parent = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='children',
        verbose_name='Escenario base',
        help_text='Escenario del que se clonó. Nulo si es original.',
    )
    is_baseline = models.BooleanField(
        'Es línea base', default=False,
        help_text='Solo un escenario por reestructuración puede ser baseline.',
    )
    payroll_plan = models.ForeignKey(
        'planta.PayrollPlan',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='scenarios',
        verbose_name='Plan de personal',
        help_text='Plan que representa este escenario.',
    )
    cached_metrics = models.JSONField(
        'Métricas en caché', default=dict, blank=True,
        help_text='Resultado del último evaluate_scenario. Se invalida al modificar el plan.',
    )

    class Meta:
        verbose_name = 'Escenario'
        verbose_name_plural = 'Escenarios'
        unique_together = [('restructuring', 'name')]
        indexes = [
            models.Index(fields=['restructuring']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['restructuring'],
                condition=models.Q(is_baseline=True),
                name='uniq_scenario_baseline',
            ),
        ]

    def __str__(self) -> str:
        baseline = ' [baseline]' if self.is_baseline else ''
        return f'{self.restructuring} — {self.name}{baseline}'
