"""
Módulo 17 — Marco Fiscal de Mediano Plazo (MFMP), Ley 819/2003.

Permite proyectar ingresos, gastos y deuda por horizonte de 10 años,
validar Ley 617/2000 (límites de funcionamiento sobre ICLD) y
Ley 358/1997 (sostenibilidad e indicadores de solvencia).
"""
from __future__ import annotations

from django.db import models
from django.db.models import Q

from apps.common.audit import AuditedModel


class MFMP(AuditedModel):
    """Marco Fiscal de Mediano Plazo de una entidad."""

    entity = models.ForeignKey(
        'core.Entity',
        on_delete=models.CASCADE,
        related_name='mfmps',
        verbose_name='Entidad',
    )
    name = models.CharField('Nombre', max_length=255)
    base_year = models.PositiveIntegerField('Año base')
    horizon_years = models.PositiveIntegerField('Años de horizonte', default=10)
    approved_by = models.CharField('Aprobado por', max_length=255, blank=True)
    approved_at = models.DateField('Fecha de aprobación', null=True, blank=True)
    notes = models.TextField('Notas', blank=True)

    class Meta:
        verbose_name = 'MFMP'
        verbose_name_plural = 'MFMPs'
        unique_together = [('entity', 'base_year', 'name')]
        indexes = [
            models.Index(fields=['entity', 'base_year']),
        ]
        ordering = ['-base_year', 'name']

    def __str__(self) -> str:
        return f'{self.name} ({self.entity.acronym or self.entity.name})'


class IncomeConcept(models.TextChoices):
    TRIBUTARIOS = 'TRIBUTARIOS', 'Tributarios'
    NO_TRIBUTARIOS = 'NO_TRIBUTARIOS', 'No tributarios'
    TRANSFERENCIAS_SGP = 'TRANSFERENCIAS_SGP', 'Transferencias SGP'
    TRANSFERENCIAS_OTRAS = 'TRANSFERENCIAS_OTRAS', 'Transferencias otras'
    REGALIAS = 'REGALIAS', 'Regalías'
    COFINANCIACION = 'COFINANCIACION', 'Cofinanciación'
    CREDITO = 'CREDITO', 'Crédito'
    RECURSOS_BALANCE = 'RECURSOS_BALANCE', 'Recursos de balance'
    OTROS = 'OTROS', 'Otros'


class ExpenseConcept(models.TextChoices):
    FUNCIONAMIENTO_PERSONAL = 'FUNCIONAMIENTO_PERSONAL', 'Funcionamiento — Personal'
    FUNCIONAMIENTO_GENERALES = 'FUNCIONAMIENTO_GENERALES', 'Funcionamiento — Gastos generales'
    FUNCIONAMIENTO_TRANSFERENCIAS = 'FUNCIONAMIENTO_TRANSFERENCIAS', 'Funcionamiento — Transferencias'
    SERVICIO_DEUDA = 'SERVICIO_DEUDA', 'Servicio de la deuda'
    INVERSION = 'INVERSION', 'Inversión'
    OTROS = 'OTROS', 'Otros'


class MFMPIncomeProjection(AuditedModel):
    """Proyección de ingresos por año y concepto."""

    mfmp = models.ForeignKey(
        MFMP,
        on_delete=models.CASCADE,
        related_name='incomes',
        verbose_name='MFMP',
    )
    year = models.PositiveIntegerField('Año')
    concept = models.CharField('Concepto', max_length=32, choices=IncomeConcept.choices)
    amount = models.DecimalField('Monto', max_digits=18, decimal_places=2, default=0)
    notes = models.CharField('Notas', max_length=255, blank=True)

    class Meta:
        verbose_name = 'Proyección de ingresos MFMP'
        verbose_name_plural = 'Proyecciones de ingresos MFMP'
        unique_together = [('mfmp', 'year', 'concept')]
        indexes = [
            models.Index(fields=['mfmp', 'year']),
            models.Index(fields=['concept']),
        ]
        ordering = ['mfmp', 'year', 'concept']

    def __str__(self) -> str:
        return f'{self.mfmp} | {self.year} | {self.concept}'


class MFMPExpenseProjection(AuditedModel):
    """Proyección de gastos por año y concepto."""

    mfmp = models.ForeignKey(
        MFMP,
        on_delete=models.CASCADE,
        related_name='expenses',
        verbose_name='MFMP',
    )
    year = models.PositiveIntegerField('Año')
    concept = models.CharField('Concepto', max_length=32, choices=ExpenseConcept.choices)
    amount = models.DecimalField('Monto', max_digits=18, decimal_places=2, default=0)
    notes = models.CharField('Notas', max_length=255, blank=True)

    class Meta:
        verbose_name = 'Proyección de gastos MFMP'
        verbose_name_plural = 'Proyecciones de gastos MFMP'
        unique_together = [('mfmp', 'year', 'concept')]
        indexes = [
            models.Index(fields=['mfmp', 'year']),
            models.Index(fields=['concept']),
        ]
        ordering = ['mfmp', 'year', 'concept']

    def __str__(self) -> str:
        return f'{self.mfmp} | {self.year} | {self.concept}'


class MFMPDebtProjection(AuditedModel):
    """Proyección de deuda por año."""

    mfmp = models.ForeignKey(
        MFMP,
        on_delete=models.CASCADE,
        related_name='debts',
        verbose_name='MFMP',
    )
    year = models.PositiveIntegerField('Año')
    outstanding_debt = models.DecimalField(
        'Saldo de deuda', max_digits=18, decimal_places=2, default=0
    )
    debt_service = models.DecimalField(
        'Servicio de deuda', max_digits=18, decimal_places=2, default=0
    )
    new_disbursements = models.DecimalField(
        'Nuevos desembolsos', max_digits=18, decimal_places=2, default=0
    )

    class Meta:
        verbose_name = 'Proyección de deuda MFMP'
        verbose_name_plural = 'Proyecciones de deuda MFMP'
        unique_together = [('mfmp', 'year')]
        indexes = [
            models.Index(fields=['mfmp', 'year']),
        ]
        ordering = ['mfmp', 'year']

    def __str__(self) -> str:
        return f'{self.mfmp} | {self.year}'


class MFMPScenario(AuditedModel):
    """
    Escenario de proyección (overrides por año/concepto en JSON).
    Solo puede haber un escenario baseline por MFMP.
    """

    mfmp = models.ForeignKey(
        MFMP,
        on_delete=models.CASCADE,
        related_name='scenarios',
        verbose_name='MFMP',
    )
    name = models.CharField('Nombre', max_length=255)
    description = models.TextField('Descripción', blank=True)
    deltas_json = models.JSONField('Deltas JSON', default=dict, blank=True)
    is_baseline = models.BooleanField('Es baseline', default=False)

    class Meta:
        verbose_name = 'Escenario MFMP'
        verbose_name_plural = 'Escenarios MFMP'
        unique_together = [('mfmp', 'name')]
        constraints = [
            models.UniqueConstraint(
                fields=['mfmp'],
                condition=Q(is_baseline=True),
                name='uniq_mfmp_baseline',
            )
        ]

    def __str__(self) -> str:
        return f'{self.mfmp} | {self.name}{"*" if self.is_baseline else ""}'
