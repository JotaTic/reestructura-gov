"""
Módulo 14 — Generador de Actos Administrativos.

Plantillas y borradores de los actos que cierran la Fase 4 (Implementación)
respetando el CPACA (Ley 1437/2011): motivación, publicidad, notificaciones.

Tipos soportados (numeral 3.2 del prompt):
- Decreto (Gobierno Nacional / Gobernador / Alcalde)
- Ordenanza (Asamblea Departamental)
- Acuerdo (Concejo Municipal / Junta Directiva)
- Resolución (entidad descentralizada / autoridad competente)
- Estatutos (reforma de entidad descentralizada)
"""
from django.db import models

from apps.core.models import Entity


class ActKind(models.TextChoices):
    DECRETO = 'DECRETO', 'Decreto'
    ORDENANZA = 'ORDENANZA', 'Ordenanza'
    ACUERDO = 'ACUERDO', 'Acuerdo'
    RESOLUCION = 'RESOLUCION', 'Resolución'
    ESTATUTOS = 'ESTATUTOS', 'Estatutos'


class ActTopic(models.TextChoices):
    ESTRUCTURA = 'ESTRUCTURA', 'Modificación de estructura'
    PLANTA = 'PLANTA', 'Adopción / modificación de planta'
    MANUAL = 'MANUAL', 'Manual específico de funciones'
    SALARIAL = 'SALARIAL', 'Escala salarial'
    SUPRESION = 'SUPRESION', 'Supresión de empleos'
    LIQUIDACION = 'LIQUIDACION', 'Supresión / liquidación de entidad'


class ActScope(models.TextChoices):
    NACIONAL = 'NACIONAL', 'Orden Nacional'
    DEPARTAMENTAL = 'DEPARTAMENTAL', 'Departamental'
    MUNICIPAL = 'MUNICIPAL', 'Municipal / Distrital'
    DESCENTRALIZADO = 'DESCENTRALIZADO', 'Entidad descentralizada'


class ActTemplate(models.Model):
    """
    Plantilla reutilizable para producir un tipo específico de acto.
    El body admite placeholders estilo {variable} resueltos en el servicio render.
    """

    kind = models.CharField('Tipo', max_length=16, choices=ActKind.choices)
    scope = models.CharField('Ámbito', max_length=16, choices=ActScope.choices)
    topic = models.CharField('Tema', max_length=16, choices=ActTopic.choices)
    name = models.CharField('Nombre', max_length=255)
    description = models.TextField('Descripción', blank=True)
    body = models.TextField(
        'Cuerpo con placeholders',
        help_text='Placeholders estilo {entity_name}, {date}, {problem_statement}, etc.',
    )
    is_active = models.BooleanField('Activa', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plantilla de acto'
        verbose_name_plural = 'Plantillas de actos'
        ordering = ['scope', 'kind', 'topic', 'name']

    def __str__(self) -> str:
        return f'{self.get_kind_display()} — {self.get_topic_display()} ({self.get_scope_display()})'


class ActDraft(models.Model):
    """
    Borrador de un acto administrativo asociado a una entidad.
    Se genera a partir de una plantilla y luego puede editarse libremente.
    """

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Borrador'
        REVIEW = 'REVIEW', 'En revisión'
        ISSUED = 'ISSUED', 'Expedido'
        ARCHIVED = 'ARCHIVED', 'Archivado'

    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name='act_drafts')
    restructuring = models.ForeignKey(
        'core.Restructuring', on_delete=models.CASCADE, related_name='act_drafts',
    )
    template = models.ForeignKey(
        ActTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='drafts',
    )
    title = models.CharField('Título', max_length=255)
    kind = models.CharField('Tipo', max_length=16, choices=ActKind.choices)
    topic = models.CharField('Tema', max_length=16, choices=ActTopic.choices)
    content = models.TextField('Contenido', blank=True)
    status = models.CharField('Estado', max_length=16, choices=Status.choices, default=Status.DRAFT)

    # Datos de expedición
    act_number = models.CharField('Número del acto', max_length=64, blank=True)
    issue_date = models.DateField('Fecha de expedición', null=True, blank=True)
    signed_by = models.CharField('Firmado por', max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Borrador de acto'
        verbose_name_plural = 'Borradores de actos'
        ordering = ['-updated_at']

    def __str__(self) -> str:
        return f'{self.get_kind_display()} — {self.title}'
