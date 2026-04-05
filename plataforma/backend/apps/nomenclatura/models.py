"""
Catálogo de nomenclatura y clasificación de empleos.

Fuentes:
- Decreto 785 de 2005 — entidades territoriales
- Decreto 2489 de 2006 — orden nacional
"""
from django.db import models


class HierarchyLevel(models.TextChoices):
    DIRECTIVO = 'DIRECTIVO', 'Directivo'
    ASESOR = 'ASESOR', 'Asesor'
    PROFESIONAL = 'PROFESIONAL', 'Profesional'
    TECNICO = 'TECNICO', 'Técnico'
    ASISTENCIAL = 'ASISTENCIAL', 'Asistencial'


class JobNomenclature(models.Model):
    """Una denominación oficial de empleo (ej. Profesional Universitario 219)."""

    class Scope(models.TextChoices):
        NACIONAL = 'NACIONAL', 'Orden nacional (Dec. 2489/2006)'
        TERRITORIAL = 'TERRITORIAL', 'Orden territorial (Dec. 785/2005)'

    scope = models.CharField('Ámbito', max_length=16, choices=Scope.choices)
    level = models.CharField('Nivel jerárquico', max_length=16, choices=HierarchyLevel.choices)
    code = models.CharField('Código', max_length=8)
    denomination = models.CharField('Denominación', max_length=255)

    class Meta:
        verbose_name = 'Denominación de empleo'
        verbose_name_plural = 'Denominaciones de empleo'
        ordering = ['scope', 'level', 'code']
        unique_together = [('scope', 'code', 'denomination')]

    def __str__(self) -> str:
        return f'{self.code} — {self.denomination} ({self.get_level_display()})'
