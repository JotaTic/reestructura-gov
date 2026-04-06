"""
Reglas legales.
R-001: norma citada en diagnóstico o acto sin estar en base legal.
R-009: acto sin citar norma habilitante correcta.
"""
from apps.common.validators import Finding, Rule, register


def _check_r001(ctx: dict) -> list:
    """R-001: norma citada en diagnóstico sin estar en la base legal (apps.legal.LegalNorm)."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []

    findings = []
    from apps.legal.models import LegalNorm
    from apps.diagnostico.models import Diagnosis

    legal_refs = set(LegalNorm.objects.values_list('reference', flat=True))

    for diag in Diagnosis.objects.filter(restructuring=restructuring):
        for ref in diag.legal_refs.all():
            # Verificar si la norma existe en la base legal
            norm_ref = ref.norm.strip()
            found = any(
                norm_ref.lower() in lr.lower() or lr.lower() in norm_ref.lower()
                for lr in legal_refs
            )
            if not found:
                findings.append(Finding(
                    rule_code='R-001',
                    severity='info',
                    message=(
                        f'La norma "{norm_ref}" citada en el diagnóstico '
                        f'"{diag.name}" no está registrada en la base legal.'
                    ),
                    subject=f'diagnostico:{diag.id}',
                    context={'diagnosis_id': diag.id, 'norm': norm_ref},
                ))
    return findings


def _check_r009(ctx: dict) -> list:
    """R-009: acto sin citar norma habilitante correcta."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []

    findings = []
    from apps.legal.models import LegalNorm
    from apps.actos.models import ActDraft

    legal_refs = list(LegalNorm.objects.values_list('reference', flat=True))

    for draft in ActDraft.objects.filter(restructuring=restructuring):
        if not draft.content:
            findings.append(Finding(
                rule_code='R-009',
                severity='warning',
                message=f'El acto "{draft.title}" no tiene contenido.',
                subject=f'acto:{draft.id}',
                context={'draft_id': draft.id},
            ))
            continue
        content_lower = draft.content.lower()
        cited = any(ref.lower() in content_lower for ref in legal_refs)
        if not cited:
            findings.append(Finding(
                rule_code='R-009',
                severity='warning',
                message=(
                    f'El acto "{draft.title}" no cita ninguna norma habilitante '
                    f'registrada en la base legal.'
                ),
                subject=f'acto:{draft.id}',
                context={'draft_id': draft.id},
            ))
    return findings


register(Rule(
    code='R-001',
    name='Norma citada sin estar en base legal',
    severity='info',
    applies_to='restructuring',
    description='Las normas citadas en el diagnóstico deben estar registradas en la base legal.',
    check=_check_r001,
))

register(Rule(
    code='R-009',
    name='Acto sin citar norma habilitante',
    severity='warning',
    applies_to='restructuring',
    description='Cada acto administrativo debe citar al menos una norma habilitante de la base legal.',
    check=_check_r009,
))
