"""
Data migration: por cada entidad con registros transaccionales huérfanos
(sin reestructuración asignada) crea una reestructuración "Legado" y los
reasigna. Idempotente.
"""
from django.db import migrations


TRANSACTIONAL = [
    ('diagnostico', 'Diagnosis'),
    ('procesos', 'ProcessMap'),
    ('cargas', 'WorkloadMatrix'),
    ('planta', 'PayrollPlan'),
    ('actos', 'ActDraft'),
]


def backfill(apps, schema_editor):
    Entity = apps.get_model('core', 'Entity')
    Restructuring = apps.get_model('core', 'Restructuring')

    # Construir índice {entity_id: restructuring_id} creado perezosamente
    legacy_by_entity: dict[int, int] = {}

    def get_legacy(entity_id: int) -> int:
        if entity_id in legacy_by_entity:
            return legacy_by_entity[entity_id]
        entity = Entity.objects.get(pk=entity_id)
        r, _ = Restructuring.objects.get_or_create(
            entity=entity,
            name='Expediente Legado',
            defaults={
                'reference_date': entity.created_at.date() if entity.created_at else '2024-01-01',
                'status': 'IN_PROGRESS',
                'description': 'Reestructuración generada automáticamente para '
                               'datos existentes antes de activar el aislamiento por contexto.',
            },
        )
        legacy_by_entity[entity_id] = r.id
        return r.id

    for app_label, model_name in TRANSACTIONAL:
        try:
            Model = apps.get_model(app_label, model_name)
        except LookupError:
            continue
        qs = Model.objects.filter(restructuring__isnull=True).only('id', 'entity_id')
        for obj in qs.iterator():
            obj.restructuring_id = get_legacy(obj.entity_id)
            obj.save(update_fields=['restructuring_id'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_restructuring'),
        ('diagnostico', '0002_diagnosis_restructuring'),
        ('procesos', '0002_processmap_restructuring'),
        ('cargas', '0002_workloadmatrix_restructuring'),
        ('planta', '0002_payrollplan_restructuring'),
        ('actos', '0002_actdraft_restructuring'),
    ]

    operations = [
        migrations.RunPython(backfill, reverse_code=noop),
    ]
