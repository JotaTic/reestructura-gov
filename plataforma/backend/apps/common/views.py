"""
Views transversales de apps.common (Sprint 4).
"""
from dataclasses import asdict

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status as drf_status


@api_view(['GET'])
def validate_restructuring(request, restructuring_id):
    """
    GET /api/validar/restructuring/<id>/
    Ejecuta todas las reglas con applies_to='restructuring' (y 'entity' para la entidad dueña)
    y devuelve findings agrupadas por severidad.
    """
    from apps.core.models import Restructuring
    from apps.common.validators import RULES

    try:
        restructuring = Restructuring.objects.select_related('entity').get(pk=restructuring_id)
    except Restructuring.DoesNotExist:
        return Response({'error': 'Reestructuración no encontrada.'}, status=drf_status.HTTP_404_NOT_FOUND)

    entity = restructuring.entity
    ctx = {'restructuring': restructuring, 'entity': entity}

    errors = []
    warnings = []
    info = []
    seen_codes = set()

    for rule in RULES:
        # Evitar duplicados por código si la misma regla fue registrada varias veces
        if rule.code in seen_codes:
            continue
        seen_codes.add(rule.code)
        try:
            findings = rule.check(ctx)
        except Exception as exc:
            # No dejar que una regla rota detenga la validación completa
            findings = []

        for f in findings:
            f_dict = asdict(f)
            if f.severity == 'error':
                errors.append(f_dict)
            elif f.severity == 'warning':
                warnings.append(f_dict)
            else:
                info.append(f_dict)

    return Response({
        'restructuring_id': restructuring_id,
        'errors': errors,
        'warnings': warnings,
        'info': info,
        'summary': {
            'total': len(errors) + len(warnings) + len(info),
            'errors': len(errors),
            'warnings': len(warnings),
            'info': len(info),
        },
    })
