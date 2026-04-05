"""
Módulo 8 — Mapa de Procesos y Cadena de Valor.

Sustenta:
- Numeral 3.4 de la Cartilla FP: análisis de procesos por opciones prioritarias
  (¿se requiere? ¿debe ejecutarlo la entidad? ¿hay duplicidad?).
- Numeral 3.6: cadena de valor (insumos → procesos → productos → efectos → impactos).
- Insumo del numeral 2.bis.2: mapa de procesos requerido para el levantamiento de cargas.
"""
from django.db import models

from apps.core.models import Entity


class ProcessMap(models.Model):
    """Mapa de procesos de la entidad en un momento dado (actual o propuesto)."""

    class Kind(models.TextChoices):
        CURRENT = 'CURRENT', 'Actual'
        PROPOSED = 'PROPOSED', 'Propuesto'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='process_maps')
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='process_maps',
    )
    kind = models.CharField('Tipo', max_length=16, choices=Kind.choices, default=Kind.CURRENT)
    name = models.CharField('Nombre', max_length=255)
    reference_date = models.DateField('Fecha de referencia')
    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Mapa de procesos'
        verbose_name_plural = 'Mapas de procesos'
        ordering = ['-reference_date', 'entity']

    def __str__(self) -> str:
        return f'{self.entity.acronym or self.entity.name} — {self.name}'


class Process(models.Model):
    """
    Un proceso dentro del mapa. Clasificado según tipología FP:
    estratégico, misional, apoyo, evaluación y control.
    """

    class Type(models.TextChoices):
        ESTRATEGICO = 'ESTRATEGICO', 'Estratégico'
        MISIONAL = 'MISIONAL', 'Misional'
        APOYO = 'APOYO', 'Apoyo'
        EVALUACION = 'EVALUACION', 'Evaluación y control'

    process_map = models.ForeignKey(ProcessMap, on_delete=models.CASCADE, related_name='processes')
    code = models.CharField('Código', max_length=32, blank=True)
    name = models.CharField('Nombre', max_length=255)
    type = models.CharField('Tipo', max_length=16, choices=Type.choices)
    description = models.TextField('Descripción', blank=True)

    # Opciones prioritarias (numeral 3.4 Cartilla)
    required = models.BooleanField('¿Se requiere?', default=True)
    executable_by_entity = models.BooleanField(
        '¿Debe ejecutarlo la entidad?', default=True,
        help_text='False → candidato a tercerización.',
    )
    duplicated = models.BooleanField('¿Hay duplicidad con otras dependencias/entidades?', default=False)

    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Proceso'
        verbose_name_plural = 'Procesos'
        ordering = ['process_map', 'type', 'order', 'name']

    def __str__(self) -> str:
        return f'[{self.type}] {self.name}'


class ValueChainLink(models.Model):
    """
    Eslabón de la cadena de valor: insumo → proceso → producto → efecto → impacto.
    Pertenece a un ProcessMap para mantener coherencia con el ciclo de planeación.
    """

    class Stage(models.TextChoices):
        INPUT = 'INPUT', 'Insumo'
        PROCESS = 'PROCESS', 'Proceso'
        OUTPUT = 'OUTPUT', 'Producto'
        OUTCOME = 'OUTCOME', 'Efecto'
        IMPACT = 'IMPACT', 'Impacto'

    process_map = models.ForeignKey(
        ProcessMap, on_delete=models.CASCADE, related_name='value_chain'
    )
    stage = models.CharField('Eslabón', max_length=16, choices=Stage.choices)
    description = models.TextField('Descripción')
    related_process = models.ForeignKey(
        Process, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='value_chain_links',
    )
    order = models.PositiveIntegerField('Orden', default=0)

    class Meta:
        verbose_name = 'Eslabón de cadena de valor'
        verbose_name_plural = 'Cadena de valor'
        ordering = ['process_map', 'stage', 'order']
        indexes = [models.Index(fields=['process_map', 'stage'])]
