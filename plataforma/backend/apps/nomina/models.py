"""
Módulo 16 — Escala salarial y factor prestacional.

Permite calcular el costo efectivo de la planta de personal considerando
el factor prestacional según el régimen de la entidad.
"""
from django.db import models

from apps.common.audit import AuditedModel
from apps.core.models import Entity


class SalaryScale(models.Model):
    """
    Escala salarial de referencia (catálogo).

    No hereda AuditedModel porque es un catálogo de datos normativos,
    no un registro transaccional.
    """

    class Order(models.TextChoices):
        NACIONAL = 'NACIONAL', 'Nacional'
        DEPARTAMENTAL = 'DEPARTAMENTAL', 'Departamental'
        DISTRITAL = 'DISTRITAL', 'Distrital'
        MUNICIPAL = 'MUNICIPAL', 'Municipal'

    class Level(models.TextChoices):
        DIRECTIVO = 'DIRECTIVO', 'Directivo'
        ASESOR = 'ASESOR', 'Asesor'
        PROFESIONAL = 'PROFESIONAL', 'Profesional'
        TECNICO = 'TECNICO', 'Técnico'
        ASISTENCIAL = 'ASISTENCIAL', 'Asistencial'

    order = models.CharField('Orden', max_length=16, choices=Order.choices)
    year = models.PositiveIntegerField('Año')
    level = models.CharField('Nivel', max_length=16, choices=Level.choices)
    grade = models.CharField('Grado', max_length=8)
    code = models.CharField('Código', max_length=8)
    base_salary = models.DecimalField('Asignación básica', max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = 'Escala salarial'
        verbose_name_plural = 'Escala salarial'
        ordering = ['order', 'year', 'level', 'code', 'grade']
        unique_together = [('order', 'year', 'level', 'code', 'grade')]
        indexes = [
            models.Index(fields=['order', 'year', 'level']),
        ]

    def __str__(self) -> str:
        return f'{self.order} {self.year} — {self.get_level_display()} {self.code}-{self.grade}: ${self.base_salary:,.0f}'


class PrestationalFactor(models.Model):
    """
    Factor prestacional para cálculo de costo real de la nómina.

    Incluye detalle de los componentes (prima servicios, cesantías, etc.)
    en un JSONField.

    No hereda AuditedModel porque es un catálogo normativo.
    """

    class Regime(models.TextChoices):
        TERRITORIAL_GENERAL = 'TERRITORIAL_GENERAL', 'Territorial general'
        NACIONAL_GENERAL = 'NACIONAL_GENERAL', 'Nacional general'
        TRABAJADOR_OFICIAL = 'TRABAJADOR_OFICIAL', 'Trabajador oficial'
        OTRO = 'OTRO', 'Otro'

    regime = models.CharField('Régimen', max_length=24, choices=Regime.choices)
    year = models.PositiveIntegerField('Año')
    factor = models.DecimalField('Factor prestacional', max_digits=5, decimal_places=4)
    detail = models.JSONField('Detalle de componentes', default=dict)

    class Meta:
        verbose_name = 'Factor prestacional'
        verbose_name_plural = 'Factores prestacionales'
        ordering = ['regime', '-year']
        unique_together = [('regime', 'year')]
        indexes = [models.Index(fields=['year'])]

    def __str__(self) -> str:
        return f'{self.get_regime_display()} {self.year}: {self.factor}'


class EntitySalaryConfig(AuditedModel):
    """Configuración salarial específica de una entidad."""

    class Regime(models.TextChoices):
        TERRITORIAL_GENERAL = 'TERRITORIAL_GENERAL', 'Territorial general'
        NACIONAL_GENERAL = 'NACIONAL_GENERAL', 'Nacional general'
        TRABAJADOR_OFICIAL = 'TRABAJADOR_OFICIAL', 'Trabajador oficial'
        OTRO = 'OTRO', 'Otro'

    entity = models.OneToOneField(
        Entity, on_delete=models.CASCADE, related_name='salary_config',
    )
    base_scale_year = models.PositiveIntegerField('Año base de escala')
    regime = models.CharField('Régimen prestacional', max_length=24, choices=Regime.choices)
    extra_components = models.JSONField('Componentes extra', default=dict)

    class Meta:
        verbose_name = 'Configuración salarial de entidad'
        verbose_name_plural = 'Configuraciones salariales'

    def __str__(self) -> str:
        return f'{self.entity} — {self.get_regime_display()} {self.base_scale_year}'
