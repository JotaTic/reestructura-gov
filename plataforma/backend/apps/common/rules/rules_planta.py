"""
Reglas de planta de personal.
R-003: cargo propuesto sin actividades en matriz.
R-007: requisitos del manual propuesto no cumplen D-785/2489.
"""
from apps.common.validators import Finding, Rule, register


def _check_r003(ctx: dict) -> list:
    """R-003: cargo propuesto sin actividades en la matriz de cargas."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    from apps.planta.models import PayrollPlan, PayrollPosition
    from apps.cargas.models import WorkloadEntry

    for plan in PayrollPlan.objects.filter(restructuring=restructuring, kind='PROPOSED'):
        for pos in plan.positions.all():
            if not pos.code:
                continue
            has_workload = WorkloadEntry.objects.filter(
                matrix__restructuring=restructuring,
                job_code=pos.code,
                job_grade=pos.grade,
            ).exists()
            if not has_workload:
                findings.append(Finding(
                    rule_code='R-003',
                    severity='warning',
                    message=(
                        f'El cargo propuesto "{pos.denomination}" ({pos.code}-{pos.grade}) '
                        f'no tiene actividades en la matriz de cargas.'
                    ),
                    subject=f'cargo:{pos.hierarchy_level} {pos.code}-{pos.grade}',
                    context={'position_id': pos.id, 'plan_id': plan.id},
                ))
    return findings


def _check_r007(ctx: dict) -> list:
    """R-007: cargo propuesto sin rol en manual o sin nivel en LEVEL_REQUIREMENTS."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    from apps.planta.models import PayrollPlan, PayrollPosition
    from apps.analisis.equivalencias import LEVEL_REQUIREMENTS

    for plan in PayrollPlan.objects.filter(restructuring=restructuring, kind='PROPOSED'):
        for pos in plan.positions.all():
            level = pos.hierarchy_level.upper()
            if level not in LEVEL_REQUIREMENTS:
                findings.append(Finding(
                    rule_code='R-007',
                    severity='warning',
                    message=(
                        f'El cargo "{pos.denomination}" tiene nivel jerárquico '
                        f'"{pos.hierarchy_level}" no contemplado en los decretos '
                        f'785/2005 o 2489/2006.'
                    ),
                    subject=f'cargo:{pos.hierarchy_level} {pos.code}-{pos.grade}',
                    context={'position_id': pos.id, 'level': pos.hierarchy_level},
                ))
    return findings


register(Rule(
    code='R-003',
    name='Cargo propuesto sin actividades en matriz',
    severity='warning',
    applies_to='restructuring',
    description='Cada cargo de la planta propuesta debe tener al menos una actividad en la matriz de cargas.',
    check=_check_r003,
))

register(Rule(
    code='R-007',
    name='Requisitos de cargo no cumplen D-785/2489',
    severity='warning',
    applies_to='restructuring',
    description='El nivel jerárquico del cargo debe estar contemplado en el decreto de nomenclatura aplicable.',
    check=_check_r007,
))
