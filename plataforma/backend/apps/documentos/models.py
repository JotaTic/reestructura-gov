"""
Módulo de Gestión Documental.

Permite adjuntar documentos (actos, manuales, presupuestos, etc.) a cualquier
objeto de la plataforma mediante GenericForeignKey.
"""
from __future__ import annotations

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.audit import AuditedModel

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


class DocumentKind(models.TextChoices):
    ACTO_ESTRUCTURA = 'ACTO_ESTRUCTURA', 'Acto de estructura'
    ACTO_PLANTA = 'ACTO_PLANTA', 'Acto de planta'
    MANUAL_VIGENTE = 'MANUAL_VIGENTE', 'Manual vigente'
    PROCEDIMIENTO = 'PROCEDIMIENTO', 'Procedimiento'
    HOJA_DE_VIDA = 'HOJA_DE_VIDA', 'Hoja de vida'
    OFICIO_DAFP = 'OFICIO_DAFP', 'Oficio DAFP'
    CONCEPTO_DAFP = 'CONCEPTO_DAFP', 'Concepto DAFP'
    CONCEPTO_MINHACIENDA = 'CONCEPTO_MINHACIENDA', 'Concepto Minhacienda'
    SENTENCIA = 'SENTENCIA', 'Sentencia'
    PRESUPUESTO = 'PRESUPUESTO', 'Presupuesto'
    MFMP_HISTORICO = 'MFMP_HISTORICO', 'MFMP histórico'
    OTRO = 'OTRO', 'Otro'


class Document(AuditedModel):
    """Documento adjunto asociado a cualquier objeto de la plataforma."""

    entity = models.ForeignKey(
        'core.Entity',
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Entidad',
    )
    restructuring = models.ForeignKey(
        'core.Restructuring',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='documents',
        verbose_name='Reestructuración',
    )

    # GenericForeignKey para asociar a cualquier objeto
    content_type = models.ForeignKey(
        ContentType,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Tipo de objeto',
    )
    object_id = models.PositiveIntegerField('ID del objeto', null=True, blank=True)
    target = GenericForeignKey('content_type', 'object_id')

    title = models.CharField('Título', max_length=255)
    kind = models.CharField('Tipo de documento', max_length=32, choices=DocumentKind.choices)
    file = models.FileField('Archivo', upload_to='documents/%Y/%m/')
    mime = models.CharField('MIME', max_length=100, blank=True)
    size = models.PositiveIntegerField('Tamaño (bytes)', default=0)
    notes = models.TextField('Notas', blank=True)
    extracted_text = models.TextField('Texto extraído (OCR)', blank=True)

    class Meta:
        verbose_name = 'Documento'
        verbose_name_plural = 'Documentos'
        indexes = [
            models.Index(fields=['entity', 'kind']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['restructuring']),
        ]
        ordering = ['-created_at']

    def clean(self) -> None:
        super().clean()
        if self.size and self.size > MAX_FILE_SIZE_BYTES:
            raise ValidationError(
                f'El archivo supera el tamaño máximo permitido de 25 MB '
                f'(tamaño detectado: {self.size / (1024*1024):.1f} MB).'
            )

    def __str__(self) -> str:
        return f'{self.title} ({self.kind})'
