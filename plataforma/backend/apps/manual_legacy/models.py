"""
Módulo 12+ — Manual de Funciones Vigente (legacy).

Permite cargar el manual de funciones vigente de la entidad (pre-reestructuración)
en formato DOCX o PDF para compararlo con la planta propuesta.
"""
from __future__ import annotations

from django.db import models

from apps.common.audit import AuditedModel


class RoleLevel(models.TextChoices):
    DIRECTIVO = 'DIRECTIVO', 'Directivo'
    ASESOR = 'ASESOR', 'Asesor'
    PROFESIONAL = 'PROFESIONAL', 'Profesional'
    TECNICO = 'TECNICO', 'Técnico'
    ASISTENCIAL = 'ASISTENCIAL', 'Asistencial'


class LegacyManual(AuditedModel):
    """Manual de funciones vigente de la entidad."""

    entity = models.ForeignKey(
        'core.Entity',
        on_delete=models.CASCADE,
        related_name='legacy_manuals',
        verbose_name='Entidad',
    )
    name = models.CharField('Nombre', max_length=255)
    act_reference = models.CharField('Acto que lo adoptó', max_length=255, blank=True)
    issue_date = models.DateField('Fecha de emisión', null=True, blank=True)
    source_file_name = models.CharField('Nombre del archivo importado', max_length=255, blank=True)
    import_report = models.JSONField('Reporte de importación', default=dict, blank=True)
    notes = models.TextField('Notas', blank=True)

    class Meta:
        verbose_name = 'Manual de funciones vigente'
        verbose_name_plural = 'Manuales de funciones vigentes'
        unique_together = [('entity', 'name')]
        indexes = [models.Index(fields=['entity'])]
        ordering = ['-issue_date', 'name']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class LegacyManualRole(AuditedModel):
    """Un cargo descrito en el manual vigente."""

    manual = models.ForeignKey(
        LegacyManual,
        on_delete=models.CASCADE,
        related_name='roles',
        verbose_name='Manual',
    )
    level = models.CharField('Nivel', max_length=16, choices=RoleLevel.choices)
    code = models.CharField('Código', max_length=8)
    grade = models.CharField('Grado', max_length=8)
    denomination = models.CharField('Denominación', max_length=255)
    main_purpose = models.TextField('Propósito principal', blank=True)
    dependencies_where_applies = models.CharField(
        'Dependencias donde aplica', max_length=500, blank=True
    )
    min_education = models.TextField('Educación mínima', blank=True)
    min_experience = models.TextField('Experiencia mínima', blank=True)
    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Cargo en manual vigente'
        verbose_name_plural = 'Cargos en manual vigente'
        indexes = [
            models.Index(fields=['manual', 'level']),
            models.Index(fields=['code', 'grade']),
        ]
        ordering = ['manual', 'order', 'code']

    def __str__(self) -> str:
        return f'{self.code}-{self.grade} {self.denomination}'


class LegacyManualFunction(AuditedModel):
    """Una función esencial de un cargo en el manual vigente."""

    role = models.ForeignKey(
        LegacyManualRole,
        on_delete=models.CASCADE,
        related_name='functions',
        verbose_name='Cargo',
    )
    order = models.PositiveIntegerField('Orden', default=0)
    description = models.TextField('Descripción')
    is_essential = models.BooleanField('¿Es esencial?', default=True)

    class Meta:
        verbose_name = 'Función en manual vigente'
        verbose_name_plural = 'Funciones en manual vigente'
        ordering = ['role', 'order']
        indexes = [models.Index(fields=['role'])]

    def __str__(self) -> str:
        return f'{self.role} — #{self.order}'
