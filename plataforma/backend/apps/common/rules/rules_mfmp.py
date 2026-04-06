"""
Reglas del MFMP.
R-006: planta propuesta rompe Ley 617 en algún año del MFMP.
"""
from apps.common.validators import Finding, Rule, register


def _check_r006(ctx: dict) -> list:
    """R-006: planta propuesta rompe Ley 617 en algún año del MFMP."""
    restructuring = ctx.get('restructuring')
    entity = ctx.get('entity')
    if restructuring is None or entity is None:
        return []

    findings = []
    from apps.mfmp.models import MFMP
    from apps.mfmp.services import simulate_plan_impact
    from apps.planta.models import PayrollPlan

    mfmps = MFMP.objects.filter(entity=entity)
    proposed_plans = PayrollPlan.objects.filter(restructuring=restructuring, kind='PROPOSED')

    for mfmp in mfmps:
        for plan in proposed_plans:
            try:
                result = simulate_plan_impact(mfmp, plan)
            except Exception:
                continue
            law617 = result.get('law_617', [])
            for year_data in law617:
                year = year_data.get('year')
                complies = year_data.get('complies')
                if complies is False:
                    ratio = year_data.get('ratio', 0)
                    limit = year_data.get('limit', 0)
                    findings.append(Finding(
                        rule_code='R-006',
                        severity='error',
                        message=(
                            f'La planta propuesta "{plan.name}" rompe la Ley 617/2000 '
                            f'en el año {year}: ratio {ratio:.1%} > límite {limit:.1%}.'
                        ),
                        subject=f'plan:{plan.id}',
                        context={
                            'plan_id': plan.id,
                            'mfmp_id': mfmp.id,
                            'year': year,
                            'ratio': ratio,
                            'limit': limit,
                        },
                    ))
    return findings


register(Rule(
    code='R-006',
    name='Planta propuesta rompe Ley 617',
    severity='error',
    applies_to='restructuring',
    description='La planta propuesta no debe romper los límites de la Ley 617/2000 en ningún año del MFMP.',
    check=_check_r006,
))
