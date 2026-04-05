"""
Módulo 5 — Base de conocimiento legal.

Catálogo buscable de normas y jurisprudencia aplicables al rediseño
institucional. Sustenta el requisito de "marco legal correlacionado" del
numeral 6 del prompt.
"""
from django.db import models


class LegalNorm(models.Model):
    """Norma o providencia citada por el módulo de Diagnóstico."""

    class Kind(models.TextChoices):
        CONSTITUCION = 'CONSTITUCION', 'Constitución'
        LEY = 'LEY', 'Ley'
        DECRETO = 'DECRETO', 'Decreto'
        RESOLUCION = 'RESOLUCION', 'Resolución'
        SENTENCIA_CC = 'SENTENCIA_CC', 'Sentencia Corte Constitucional'
        SENTENCIA_CE = 'SENTENCIA_CE', 'Sentencia Consejo de Estado'
        CONPES = 'CONPES', 'Documento CONPES'
        OTRO = 'OTRO', 'Otro'

    kind = models.CharField('Tipo', max_length=16, choices=Kind.choices)
    reference = models.CharField('Referencia', max_length=128, help_text='Ej.: Ley 489 de 1998')
    title = models.CharField('Título', max_length=255)
    year = models.PositiveSmallIntegerField('Año')
    summary = models.TextField('Resumen / tema principal')
    key_articles = models.TextField(
        'Artículos clave', blank=True,
        help_text='Artículos o apartes relevantes para el rediseño.',
    )
    applies_to = models.CharField(
        'Aplica a', max_length=255, blank=True,
        help_text='Ej.: Territoriales, Orden Nacional, Supresión de empleos…',
    )
    url = models.URLField('Enlace oficial', blank=True)

    class Meta:
        verbose_name = 'Norma o jurisprudencia'
        verbose_name_plural = 'Base legal'
        ordering = ['-year', 'kind', 'reference']
        indexes = [models.Index(fields=['kind', 'year'])]

    def __str__(self) -> str:
        return self.reference
