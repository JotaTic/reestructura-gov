"""
Reglas de la matriz de cargas.
R-005: suma h-h/mes por cargo > 167 horas.
R-011: cargo en matriz sin dependencia.
"""
from apps.common.validators import Finding, Rule, register


def _check_r005(ctx: dict) -> list:
    """R-005: suma horas-hombre/mes por cargo > 167 (jornada máxima)."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    from decimal import Decimal
    from apps.cargas.models import WorkloadMatrix, WorkloadEntry
    HOURS_LIMIT = Decimal('167')
    for matrix in WorkloadMatrix.objects.filter(restructuring=restructuring):
        # Agrupar por (job_code, job_grade, job_denomination)
        from django.db.models import Sum
        groups = (
            WorkloadEntry.objects
            .filter(matrix=matrix)
            .values('job_code', 'job_grade', 'job_denomination')
            .annotate(total_hh=Sum('hh_month'))
        )
        for g in groups:
            total = g['total_hh'] or Decimal('0')
            if total > HOURS_LIMIT:
                key = f"{g['job_denomination']} {g['job_code']}-{g['job_grade']}"
                findings.append(Finding(
                    rule_code='R-005',
                    severity='error',
                    message=(
                        f'El cargo "{key}" tiene {float(total):.1f} horas-hombre/mes, '
                        f'superando el límite de {float(HOURS_LIMIT):.0f} h/mes.'
                    ),
                    subject=f'cargo:{key}',
                    context={
                        'job_code': g['job_code'],
                        'job_grade': g['job_grade'],
                        'total_hh': float(total),
                        'limit': 167,
                    },
                ))
    return findings


def _check_r011(ctx: dict) -> list:
    """R-011: cargo en matriz de cargas sin dependencia asignada."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    from apps.cargas.models import WorkloadMatrix, WorkloadEntry
    for matrix in WorkloadMatrix.objects.filter(restructuring=restructuring):
        entries_without_dept = WorkloadEntry.objects.filter(
            matrix=matrix, department__isnull=True
        )
        for entry in entries_without_dept:
            findings.append(Finding(
                rule_code='R-011',
                severity='warning',
                message=(
                    f'La actividad "{entry.activity[:60]}" del cargo '
                    f'"{entry.job_denomination}" no tiene dependencia asignada.'
                ),
                subject=f'cargo:{entry.job_denomination}',
                context={'entry_id': entry.id},
            ))
    return findings


register(Rule(
    code='R-005',
    name='Cargo con carga > 167 h/mes',
    severity='error',
    applies_to='restructuring',
    description='La suma de horas-hombre/mes de un cargo no debe superar 167 h.',
    check=_check_r005,
))

register(Rule(
    code='R-011',
    name='Cargo en matriz sin dependencia',
    severity='warning',
    applies_to='restructuring',
    description='Cada entrada de la matriz de cargas debe tener una dependencia asignada.',
    check=_check_r011,
))
