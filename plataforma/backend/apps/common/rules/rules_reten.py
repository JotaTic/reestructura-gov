"""
Reglas del retén social.
R-004: cargo a suprimir sin análisis de retén.
R-008: empleado de carrera con cargo suprimido sin plan de reincorporación.
"""
from apps.common.validators import Finding, Rule, register


def _check_r004(ctx: dict) -> list:
    """R-004: cargo a suprimir sin análisis de retén (ProtectedEmployee)."""
    restructuring = ctx.get('restructuring')
    entity = ctx.get('entity')
    if restructuring is None or entity is None:
        return []

    from apps.planta.models import PayrollPlan, PayrollPosition
    from apps.reten.models import ProtectedEmployee

    # Verificar si hay planta propuesta con cargos que se eliminan vs la actual
    proposed_plans = PayrollPlan.objects.filter(restructuring=restructuring, kind='PROPOSED')
    if not proposed_plans.exists():
        return []

    has_reten = ProtectedEmployee.objects.filter(entity=entity, active=True).exists()
    if not has_reten:
        return [Finding(
            rule_code='R-004',
            severity='warning',
            message=(
                'Hay planta propuesta pero no se ha realizado el análisis del retén social. '
                'Verifique la población protegida antes de suprimir cargos.'
            ),
            subject=f'restructuring:{restructuring.id}',
            context={'restructuring_id': restructuring.id},
        )]
    return []


def _check_r008(ctx: dict) -> list:
    """R-008: empleado de carrera con cargo suprimido sin plan de reincorporación."""
    restructuring = ctx.get('restructuring')
    entity = ctx.get('entity')
    if restructuring is None or entity is None:
        return []

    findings = []
    from apps.planta.models import PayrollPlan, PayrollPosition
    from apps.talento.models import EmploymentRecord

    proposed_plans = PayrollPlan.objects.filter(restructuring=restructuring, kind='PROPOSED')
    if not proposed_plans.exists():
        return []

    proposed_codes = set(
        PayrollPosition.objects
        .filter(plan__in=proposed_plans)
        .values_list('code', 'grade')
    )

    # Empleados de carrera cuyo cargo (code, grade) no está en la planta propuesta
    career_records = EmploymentRecord.objects.filter(
        entity=entity,
        is_active=True,
        appointment_type='CARRERA',
    ).select_related('position')

    for rec in career_records:
        if rec.position is None:
            continue
        if (rec.position.code, rec.position.grade) not in proposed_codes:
            findings.append(Finding(
                rule_code='R-008',
                severity='warning',
                message=(
                    f'El empleado de carrera "{rec.employee.full_name}" ocupa el cargo '
                    f'"{rec.position.denomination}" que no está en la planta propuesta. '
                    f'Verifique el plan de reincorporación.'
                ),
                subject=f'empleado:{rec.employee_id}',
                context={
                    'employee_id': rec.employee_id,
                    'position_id': rec.position_id,
                },
            ))
    return findings


register(Rule(
    code='R-004',
    name='Cargo a suprimir sin análisis de retén',
    severity='warning',
    applies_to='restructuring',
    description='Cuando hay planta propuesta, debe existir análisis del retén social.',
    check=_check_r004,
))

register(Rule(
    code='R-008',
    name='Empleado de carrera con cargo suprimido sin plan de reincorporación',
    severity='warning',
    applies_to='restructuring',
    description='Los empleados de carrera con cargo suprimido requieren un plan de reincorporación.',
    check=_check_r008,
))
