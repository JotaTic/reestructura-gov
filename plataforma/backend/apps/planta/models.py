"""
Módulo 11 — Planta de Personal (actual vs propuesta).

Sustenta el numeral 3.9 de la Fase de Diseño (Cartilla FP 2018):
- Comparativo planta actual vs propuesta (número de cargos, costos).
- Art. 21 Ley 909/2004: planta global recomendada por FP.
- Nomenclaturas: Decreto 785/2005 (territorial) y Decreto 2489/2006 (nacional).
"""
from decimal import Decimal
from django.db import models

from apps.core.models import Entity, Department
from apps.nomenclatura.models import HierarchyLevel


class PayrollPlan(models.Model):
    """
    Planta de personal de una entidad. Puede ser la ACTUAL (línea base) o una
    PROPUESTA del estudio técnico. Una misma entidad puede tener varias propuestas.
    """

    class Kind(models.TextChoices):
        CURRENT = 'CURRENT', 'Planta actual'
        PROPOSED = 'PROPOSED', 'Planta propuesta'

    class Structure(models.TextChoices):
        GLOBAL = 'GLOBAL', 'Global'
        STRUCTURAL = 'STRUCTURAL', 'Estructural'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='payroll_plans')
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='payroll_plans',
    )
    kind = models.CharField('Tipo', max_length=16, choices=Kind.choices)
    structure = models.CharField(
        'Estructura', max_length=16, choices=Structure.choices, default=Structure.GLOBAL
    )
    name = models.CharField('Nombre', max_length=255)
    reference_date = models.DateField('Fecha de referencia')
    adopted_by = models.CharField(
        'Acto administrativo que la adopta', max_length=255, blank=True,
        help_text='Decreto/Resolución/Acuerdo. Solo para planta actual.',
    )
    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Planta de personal'
        verbose_name_plural = 'Plantas de personal'
        ordering = ['-reference_date', 'entity', 'kind']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.get_kind_display()}: {self.name}'

    def fiscal_impact(self, mfmp):
        """
        Calcula el impacto fiscal de esta planta sobre el MFMP dado.
        Import tardío para evitar ciclos de importación.
        """
        from apps.mfmp.services import simulate_plan_impact
        return simulate_plan_impact(mfmp, self)


class PayrollPosition(models.Model):
    """
    Una fila de la planta: un cargo específico con cantidad y costo mensual.
    """

    plan = models.ForeignKey(PayrollPlan, on_delete=models.CASCADE, related_name='positions')
    department = models.ForeignKey(
        Department, on_delete=models.PROTECT, null=True, blank=True,
        related_name='payroll_positions',
        help_text='Solo aplica en planta estructural.',
    )
    hierarchy_level = models.CharField('Nivel jerárquico', max_length=16, choices=HierarchyLevel.choices)
    denomination = models.CharField('Denominación del empleo', max_length=255)
    code = models.CharField('Código', max_length=8, blank=True)
    grade = models.CharField('Grado', max_length=8, blank=True)
    quantity = models.PositiveIntegerField('Cantidad', default=1)
    monthly_salary = models.DecimalField(
        'Asignación básica mensual', max_digits=12, decimal_places=2, default=Decimal('0'),
    )
    notes = models.CharField('Observaciones', max_length=255, blank=True)

    # Sprint 1 — vínculo con la hoja de vida del empleado que ocupa el cargo
    occupant = models.ForeignKey(
        'talento.Employee',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='positions_held',
        verbose_name='Empleado ocupante',
    )

    class Meta:
        verbose_name = 'Cargo de planta'
        verbose_name_plural = 'Cargos de planta'
        ordering = ['plan', 'hierarchy_level', 'code', 'grade']
        indexes = [
            models.Index(fields=['plan', 'hierarchy_level']),
            models.Index(fields=['plan', 'code', 'grade']),
            models.Index(fields=['occupant']),
        ]

    @property
    def total_monthly(self) -> Decimal:
        return (Decimal(self.quantity) * self.monthly_salary).quantize(Decimal('0.01'))

    @property
    def total_annual(self) -> Decimal:
        # 12 meses + prestaciones aproximadas ~1.5 factor; FP recomienda usar el factor real
        # según régimen prestacional. Mantenemos simple: 12× salario mensual total.
        return (self.total_monthly * Decimal('12')).quantize(Decimal('0.01'))

    def __str__(self) -> str:
        return f'{self.code}-{self.grade} {self.denomination} ×{self.quantity}'
