"""
Reglas del núcleo (core): objetivos, dependencias, escalas.
R-010, R-012, R-014, R-015
"""
from apps.common.validators import Finding, Rule, register


def _check_r010(ctx: dict) -> list:
    """R-010: objetivo sin indicador medible."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    for obj in restructuring.objectives.all():
        if not obj.indicator or not obj.indicator.strip():
            findings.append(Finding(
                rule_code='R-010',
                severity='warning',
                message=f'El objetivo "{obj.get_kind_display()}" no tiene indicador de seguimiento definido.',
                subject=f'objetivo:{obj.kind}',
                context={'objective_id': obj.id},
            ))
    return findings


def _check_r012(ctx: dict) -> list:
    """R-012: ciclo en árbol de dependencias (detección simple)."""
    entity = ctx.get('entity')
    if entity is None:
        return []
    findings = []
    from apps.core.models import Department
    depts = Department.objects.filter(entity=entity)
    dept_map = {d.id: d.parent_id for d in depts}
    for dept in depts:
        visited = set()
        current = dept.parent_id
        while current is not None:
            if current in visited or current == dept.id:
                findings.append(Finding(
                    rule_code='R-012',
                    severity='error',
                    message=f'La dependencia "{dept.name}" forma parte de un ciclo en la jerarquía.',
                    subject=f'dependencia:{dept.id}',
                    context={'department_id': dept.id},
                ))
                break
            visited.add(current)
            current = dept_map.get(current)
    return findings


def _check_r014(ctx: dict) -> list:
    """R-014: reestructuración sin objetivo definido."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    if not restructuring.objectives.exists():
        return [Finding(
            rule_code='R-014',
            severity='error',
            message='La reestructuración no tiene objetivos definidos.',
            subject=f'restructuring:{restructuring.id}',
            context={'restructuring_id': restructuring.id},
        )]
    return []


def _check_r015(ctx: dict) -> list:
    """R-015: escala salarial desactualizada > 1 año del decreto vigente."""
    entity = ctx.get('entity')
    if entity is None:
        return []
    from datetime import date
    from apps.nomina.models import SalaryScale
    current_year = date.today().year
    latest = SalaryScale.objects.filter(order=entity.order).order_by('-year').first()
    if latest is None:
        return [Finding(
            rule_code='R-015',
            severity='warning',
            message='No hay escala salarial registrada para el orden de la entidad.',
            subject=f'entity:{entity.id}',
            context={'entity_id': entity.id},
        )]
    if (current_year - latest.year) > 1:
        return [Finding(
            rule_code='R-015',
            severity='warning',
            message=(
                f'La escala salarial más reciente es del año {latest.year}. '
                f'Puede estar desactualizada (año actual: {current_year}).'
            ),
            subject=f'entity:{entity.id}',
            context={'latest_year': latest.year, 'current_year': current_year},
        )]
    return []


# Registrar las reglas
register(Rule(
    code='R-010',
    name='Objetivo sin indicador medible',
    severity='warning',
    applies_to='restructuring',
    description='Cada objetivo debe tener un indicador de seguimiento definido.',
    check=_check_r010,
))

register(Rule(
    code='R-012',
    name='Ciclo en árbol de dependencias',
    severity='error',
    applies_to='entity',
    description='No debe existir ciclo en la jerarquía de dependencias.',
    check=_check_r012,
))

register(Rule(
    code='R-014',
    name='Reestructuración sin objetivo',
    severity='error',
    applies_to='restructuring',
    description='La reestructuración debe tener al menos un objetivo definido.',
    check=_check_r014,
))

register(Rule(
    code='R-015',
    name='Escala salarial desactualizada',
    severity='warning',
    applies_to='entity',
    description='La escala salarial debe actualizarse según el decreto vigente (máximo 1 año de antigüedad).',
    check=_check_r015,
))
