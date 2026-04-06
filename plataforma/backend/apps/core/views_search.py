"""Sprint 11 — Global search across key models."""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """
    GET /api/buscar/?q=<query>
    Search employees, departments, and legal mandates.
    Returns max 5 results per type.
    """
    q = request.query_params.get('q', '').strip()
    if len(q) < 2:
        return Response({'results': []})

    results = []

    # Search employees
    try:
        from apps.talento.models import Employee
        for e in Employee.objects.filter(full_name__icontains=q)[:5]:
            results.append({
                'type': 'employee',
                'id': e.id,
                'label': e.full_name,
                'url': f'/talento/empleados/{e.id}',
            })
    except Exception:
        pass

    # Search departments
    try:
        from apps.core.models import Department
        for d in Department.objects.filter(name__icontains=q)[:5]:
            results.append({
                'type': 'department',
                'id': d.id,
                'label': d.name,
                'url': '/dependencias',
            })
    except Exception:
        pass

    # Search mandates
    try:
        from apps.mandatos.models import LegalMandate
        for m in LegalMandate.objects.filter(mandate_text__icontains=q)[:5]:
            results.append({
                'type': 'mandate',
                'id': m.id,
                'label': f'{m.norm} Art.{m.article}',
                'url': '/mandatos',
            })
    except Exception:
        pass

    return Response({'results': results})
