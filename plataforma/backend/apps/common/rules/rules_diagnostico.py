"""
Reglas de diagnóstico.
R-013: diagnóstico sin ítems DOFA.
"""
from apps.common.validators import Finding, Rule, register


def _check_r013(ctx: dict) -> list:
    """R-013: diagnóstico sin ítems DOFA."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    from apps.diagnostico.models import Diagnosis
    for diag in Diagnosis.objects.filter(restructuring=restructuring):
        if not diag.swot_items.exists():
            findings.append(Finding(
                rule_code='R-013',
                severity='warning',
                message=f'El diagnóstico "{diag.name}" no tiene ítems DOFA registrados.',
                subject=f'diagnostico:{diag.id}',
                context={'diagnosis_id': diag.id},
            ))
    return findings


register(Rule(
    code='R-013',
    name='Diagnóstico sin ítems DOFA',
    severity='warning',
    applies_to='restructuring',
    description='Cada diagnóstico debe tener al menos un ítem DOFA en sus cinco dimensiones.',
    check=_check_r013,
))
