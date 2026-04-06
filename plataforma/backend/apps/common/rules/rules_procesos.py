"""
Reglas de procesos.
R-002: proceso sin respuesta a los 3 interrogantes 3.4.
"""
from apps.common.validators import Finding, Rule, register


def _check_r002(ctx: dict) -> list:
    """R-002: proceso sin respuesta a los 3 interrogantes del numeral 3.4."""
    restructuring = ctx.get('restructuring')
    if restructuring is None:
        return []
    findings = []
    from apps.procesos.models import ProcessMap, Process
    for pmap in ProcessMap.objects.filter(restructuring=restructuring):
        for proc in Process.objects.filter(process_map=pmap):
            # Los tres interrogantes son: required, executable_by_entity, duplicated.
            # Si todos son True (o False en el caso de duplicated) significa que fueron
            # revisados. La regla R-002 verifica simplemente que existan procesos cargados.
            # Interpretación semántica: todos tienen valores por defecto no nulos.
            # La regla se dispara si hay un proceso que no tenga datos reales cargados
            # (description vacía Y todos los flags en valor default).
            if (
                not proc.description
                and proc.required  # default True
                and proc.executable_by_entity  # default True
                and not proc.duplicated  # default False
            ):
                findings.append(Finding(
                    rule_code='R-002',
                    severity='warning',
                    message=(
                        f'El proceso "{proc.name}" no tiene descripción ni ha respondido '
                        f'los interrogantes del numeral 3.4 de la Cartilla.'
                    ),
                    subject=f'proceso:{proc.code or proc.id}',
                    context={'process_id': proc.id, 'process_map_id': pmap.id},
                ))
    return findings


register(Rule(
    code='R-002',
    name='Proceso sin respuesta a los 3 interrogantes 3.4',
    severity='warning',
    applies_to='restructuring',
    description=(
        'Cada proceso debe responder: ¿Se requiere?, '
        '¿Debe ejecutarlo la entidad?, ¿Hay duplicidad?'
    ),
    check=_check_r002,
))
