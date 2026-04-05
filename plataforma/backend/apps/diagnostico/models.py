"""
Módulo 6 — Diagnóstico (Fase 2 de la Cartilla FP 2018).

Produce los productos de la Fase de Diagnóstico:
- Marco legal correlacionado (cada norma vinculada a una decisión).
- Rol institucional (misión/objeto, funciones, duplicidades).
- DOFA en cinco dimensiones: directiva, competitiva, técnica, tecnológica, talento humano.
- Análisis de entornos: económico, político, social, tecnológico (y otros).
"""
from django.db import models

from apps.core.models import Entity


class Diagnosis(models.Model):
    """Contenedor del diagnóstico de una entidad en una fecha de referencia."""

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='diagnoses')
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='diagnoses',
    )
    name = models.CharField('Nombre', max_length=255)
    reference_date = models.DateField('Fecha de referencia')

    # Rol institucional
    mission = models.TextField('Misión / objeto social', blank=True)
    vision = models.TextField('Visión', blank=True)
    functions_analysis = models.TextField(
        'Análisis de funciones generales', blank=True,
        help_text='Variaciones en el tiempo, duplicidades, posibilidad de tercerización.',
    )
    duplications = models.TextField('Duplicidades identificadas', blank=True)

    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Diagnóstico'
        verbose_name_plural = 'Diagnósticos'
        ordering = ['-reference_date', 'entity']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class SwotItem(models.Model):
    """Un ítem del DOFA clasificado por tipo y dimensión."""

    class Type(models.TextChoices):
        FORTALEZA = 'F', 'Fortaleza'
        DEBILIDAD = 'D', 'Debilidad'
        OPORTUNIDAD = 'O', 'Oportunidad'
        AMENAZA = 'A', 'Amenaza'

    class Dimension(models.TextChoices):
        DIRECTIVA = 'DIRECTIVA', 'Directiva'
        COMPETITIVA = 'COMPETITIVA', 'Competitiva'
        TECNICA = 'TECNICA', 'Técnica'
        TECNOLOGICA = 'TECNOLOGICA', 'Tecnológica'
        TALENTO_HUMANO = 'TH', 'Talento humano'

    class Priority(models.IntegerChoices):
        BAJA = 1, 'Baja'
        MEDIA = 2, 'Media'
        ALTA = 3, 'Alta'

    diagnosis = models.ForeignKey(Diagnosis, on_delete=models.CASCADE, related_name='swot_items')
    type = models.CharField('Tipo', max_length=1, choices=Type.choices)
    dimension = models.CharField('Dimensión', max_length=16, choices=Dimension.choices)
    description = models.TextField('Descripción')
    priority = models.PositiveSmallIntegerField('Prioridad', choices=Priority.choices, default=Priority.MEDIA)
    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Ítem DOFA'
        verbose_name_plural = 'Ítems DOFA'
        ordering = ['diagnosis', 'type', 'dimension', 'order']
        indexes = [models.Index(fields=['diagnosis', 'type', 'dimension'])]


class LegalReference(models.Model):
    """
    Marco legal correlacionado: cada norma/jurisprudencia vinculada a una
    decisión concreta del rediseño. Restricción del numeral 6 del prompt.
    """

    diagnosis = models.ForeignKey(Diagnosis, on_delete=models.CASCADE, related_name='legal_refs')
    norm = models.CharField('Norma / jurisprudencia', max_length=255)
    article = models.CharField('Artículo / providencia', max_length=128, blank=True)
    topic = models.CharField('Tema', max_length=255, blank=True)
    correlated_decision = models.TextField(
        'Decisión del rediseño que la invoca',
        help_text='Obligatorio: no se permite citar normas descontextualizadas.',
    )
    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Referencia legal'
        verbose_name_plural = 'Marco legal correlacionado'
        ordering = ['diagnosis', 'order', 'norm']


class EnvironmentAnalysis(models.Model):
    """Análisis de entornos (económico, político, social, tecnológico, otros)."""

    class Dimension(models.TextChoices):
        ECONOMICO = 'ECONOMICO', 'Económico'
        POLITICO = 'POLITICO', 'Político'
        SOCIAL = 'SOCIAL', 'Social'
        TECNOLOGICO = 'TECNOLOGICO', 'Tecnológico'
        CULTURAL = 'CULTURAL', 'Cultura organizacional'
        OTRO = 'OTRO', 'Otro'

    class Impact(models.IntegerChoices):
        NEGATIVO = -1, 'Negativo'
        NEUTRO = 0, 'Neutro'
        POSITIVO = 1, 'Positivo'

    diagnosis = models.ForeignKey(Diagnosis, on_delete=models.CASCADE, related_name='environments')
    dimension = models.CharField('Dimensión', max_length=16, choices=Dimension.choices)
    description = models.TextField('Descripción')
    impact = models.SmallIntegerField('Impacto', choices=Impact.choices, default=Impact.NEUTRO)
    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Análisis de entorno'
        verbose_name_plural = 'Análisis de entornos'
        ordering = ['diagnosis', 'dimension', 'order']
