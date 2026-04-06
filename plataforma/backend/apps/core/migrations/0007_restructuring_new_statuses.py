"""
Sprint 5 — Migración de estados de Restructuring.

Pasos:
1. AlterField con el set AMPLIADO (legacy + nuevos) para no romper constraints.
2. RunPython: mapea valores legacy → nuevos equivalentes.
3. AlterField final: solo los 12 nuevos valores.
4. Añade campo current_status_since.

El reverse_code deshace el remapeo volviendo a los valores legacy equivalentes.
"""
from django.db import migrations, models


LEGACY_TO_NEW = {
    'DRAFT': 'BORRADOR',
    'IN_PROGRESS': 'ANALISIS_COMPLETO',
    'APPROVED': 'APROBADO',
    'IMPLEMENTED': 'IMPLEMENTADO',
    'ARCHIVED': 'ARCHIVADO',
}

NEW_TO_LEGACY = {v: k for k, v in LEGACY_TO_NEW.items()}

# Los valores que no son legacy ni nuevos se dejan igual (caso borde).
COMBINED_CHOICES = [
    # Legacy
    ('DRAFT', 'Borrador (legacy)'),
    ('IN_PROGRESS', 'En curso (legacy)'),
    ('APPROVED', 'Aprobada (legacy)'),
    ('IMPLEMENTED', 'Implementada (legacy)'),
    ('ARCHIVED', 'Archivada (legacy)'),
    # Nuevos
    ('BORRADOR', 'Borrador'),
    ('DIAGNOSTICO_COMPLETO', 'Diagnóstico completo'),
    ('ANALISIS_COMPLETO', 'Análisis completo'),
    ('REVISION_JURIDICA', 'Revisión jurídica'),
    ('REVISION_FINANCIERA', 'Revisión financiera'),
    ('CONCEPTO_DAFP_SOLICITADO', 'Concepto DAFP solicitado'),
    ('CONCEPTO_DAFP_RECIBIDO', 'Concepto DAFP recibido'),
    ('COMISION_PERSONAL_INFORMADA', 'Comisión de personal informada'),
    ('APROBADO', 'Aprobada'),
    ('ACTO_EXPEDIDO', 'Acto expedido'),
    ('IMPLEMENTADO', 'Implementada'),
    ('ARCHIVADO', 'Archivada'),
]

NEW_ONLY_CHOICES = [
    ('BORRADOR', 'Borrador'),
    ('DIAGNOSTICO_COMPLETO', 'Diagnóstico completo'),
    ('ANALISIS_COMPLETO', 'Análisis completo'),
    ('REVISION_JURIDICA', 'Revisión jurídica'),
    ('REVISION_FINANCIERA', 'Revisión financiera'),
    ('CONCEPTO_DAFP_SOLICITADO', 'Concepto DAFP solicitado'),
    ('CONCEPTO_DAFP_RECIBIDO', 'Concepto DAFP recibido'),
    ('COMISION_PERSONAL_INFORMADA', 'Comisión de personal informada'),
    ('APROBADO', 'Aprobada'),
    ('ACTO_EXPEDIDO', 'Acto expedido'),
    ('IMPLEMENTADO', 'Implementada'),
    ('ARCHIVADO', 'Archivada'),
]


def forward_migrate_statuses(apps, schema_editor):
    Restructuring = apps.get_model('core', 'Restructuring')
    for restr in Restructuring.objects.all():
        new_status = LEGACY_TO_NEW.get(restr.status)
        if new_status:
            restr.status = new_status
            restr.save(update_fields=['status'])


def reverse_migrate_statuses(apps, schema_editor):
    Restructuring = apps.get_model('core', 'Restructuring')
    for restr in Restructuring.objects.all():
        old_status = NEW_TO_LEGACY.get(restr.status)
        if old_status:
            restr.status = old_status
            restr.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_restructuringobjective'),
    ]

    operations = [
        # Paso 1: Ampliar el campo para aceptar AMBOS conjuntos
        migrations.AlterField(
            model_name='restructuring',
            name='status',
            field=models.CharField(
                choices=COMBINED_CHOICES,
                default='BORRADOR',
                max_length=32,
                verbose_name='Estado',
            ),
        ),
        # Paso 2: Backfill de valores legacy → nuevos
        migrations.RunPython(
            forward_migrate_statuses,
            reverse_code=reverse_migrate_statuses,
        ),
        # Paso 3: Dejar solo los nuevos valores
        migrations.AlterField(
            model_name='restructuring',
            name='status',
            field=models.CharField(
                choices=NEW_ONLY_CHOICES,
                default='BORRADOR',
                max_length=32,
                verbose_name='Estado',
            ),
        ),
        # Paso 4: Añadir current_status_since
        migrations.AddField(
            model_name='restructuring',
            name='current_status_since',
            field=models.DateTimeField(
                blank=True,
                help_text='Fecha/hora en que entró al estado actual. Útil para medir tiempos de proceso.',
                null=True,
                verbose_name='En estado actual desde',
            ),
        ),
    ]
