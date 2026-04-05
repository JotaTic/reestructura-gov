"""
Módulo 7 — Análisis Financiero.

Sustenta el numeral 3.3 (Fase de Diseño): análisis de 4 años de ejecución +
proyección, con los indicadores de Ley 617/2000 y Ley 358/1997.
"""
from decimal import Decimal
from django.db import models

from apps.core.models import Entity


class FiscalYear(models.Model):
    """Indicadores financieros de un año fiscal para una entidad."""

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='fiscal_years')
    year = models.PositiveSmallIntegerField('Año')

    # Ingresos y gastos
    current_income = models.DecimalField(
        'Ingresos corrientes de libre destinación (ICLD)',
        max_digits=16, decimal_places=2, default=Decimal('0'),
    )
    operating_expenses = models.DecimalField(
        'Gastos de funcionamiento', max_digits=16, decimal_places=2, default=Decimal('0'),
    )
    personnel_expenses = models.DecimalField(
        'Gastos de personal', max_digits=16, decimal_places=2, default=Decimal('0'),
    )

    # Ley 617/2000 — límite según categoría
    law_617_limit_pct = models.DecimalField(
        'Límite Ley 617/2000 (%)', max_digits=5, decimal_places=2, default=Decimal('50'),
        help_text='Porcentaje máximo de gastos de funcionamiento sobre ICLD según categoría.',
    )

    # Ley 358/1997 — indicadores de endeudamiento
    debt_service = models.DecimalField(
        'Servicio de la deuda', max_digits=16, decimal_places=2, default=Decimal('0'),
    )
    total_debt = models.DecimalField(
        'Saldo de la deuda', max_digits=16, decimal_places=2, default=Decimal('0'),
    )

    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Año fiscal'
        verbose_name_plural = 'Años fiscales'
        ordering = ['entity', 'year']
        unique_together = [('entity', 'year')]

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.year}'

    # ---- Indicadores calculados ----

    @property
    def law_617_ratio(self) -> Decimal:
        """Porcentaje gastos de funcionamiento / ICLD."""
        if self.current_income and self.current_income > 0:
            return (self.operating_expenses / self.current_income * Decimal('100')).quantize(Decimal('0.01'))
        return Decimal('0')

    @property
    def law_617_compliant(self) -> bool:
        return self.law_617_ratio <= self.law_617_limit_pct

    @property
    def solvency_ratio(self) -> Decimal:
        """Ley 358/1997 — intereses deuda / ahorro operacional. Simplificado."""
        if self.current_income and self.current_income > 0:
            return (self.debt_service / self.current_income * Decimal('100')).quantize(Decimal('0.01'))
        return Decimal('0')

    @property
    def sustainability_ratio(self) -> Decimal:
        """Ley 358/1997 — saldo deuda / ICLD."""
        if self.current_income and self.current_income > 0:
            return (self.total_debt / self.current_income * Decimal('100')).quantize(Decimal('0.01'))
        return Decimal('0')
