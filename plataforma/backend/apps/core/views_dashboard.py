"""
Sprint 6 — Dashboard ejecutivo.

GET /api/dashboard/?entity=<id>

Devuelve KPIs globales o específicos de entidad para el panel principal.
"""
from datetime import date, timezone as py_tz

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.mixins import get_user_allowed_entity_ids
from apps.core.models import Entity, Restructuring


def _days_since(dt) -> int | None:
    """Calcula días desde una fecha/datetime hasta hoy."""
    if dt is None:
        return None
    if hasattr(dt, 'date'):
        d = dt.date()
    else:
        d = dt
    return (date.today() - d).days


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """
    GET /api/dashboard/?entity=<id>

    Si viene ?entity=<id>, devuelve también per_restructuring con detalle.
    Si no viene, agrega todas las entidades permitidas al usuario.
    """
    user = request.user
    allowed_entity_ids = get_user_allowed_entity_ids(user)

    # Filtrar por entidad específica si viene el parámetro
    entity_filter = request.query_params.get('entity')
    entity_id = None
    if entity_filter:
        try:
            entity_id = int(entity_filter)
        except (TypeError, ValueError):
            pass

    # Determinar entidades visibles
    if allowed_entity_ids is None:
        # Superuser: todas
        entity_qs = Entity.objects.all()
    else:
        entity_qs = Entity.objects.filter(pk__in=allowed_entity_ids)

    if entity_id:
        entity_qs = entity_qs.filter(pk=entity_id)

    entity_ids = list(entity_qs.values_list('pk', flat=True))

    # ---- Reestructuraciones ----
    restructurings_qs = Restructuring.objects.filter(
        entity_id__in=entity_ids
    ).select_related('entity').prefetch_related('objectives')

    restructurings_data = []
    for r in restructurings_qs:
        restructurings_data.append({
            'id': r.id,
            'name': r.name,
            'status': r.status,
            'status_display': r.get_status_display(),
            'current_status_since': r.current_status_since.isoformat() if r.current_status_since else None,
            'days_in_status': _days_since(r.current_status_since),
            'entity_name': r.entity.name,
            'entity_id': r.entity_id,
            'objectives_count': r.objectives.count(),
        })

    # ---- Summary ----
    by_status: dict = {}
    for r in restructurings_qs:
        by_status[r.status] = by_status.get(r.status, 0) + 1

    # Empleados y posiciones
    total_employees = 0
    total_protected = 0
    total_positions_current = 0
    total_positions_proposed = 0
    validation_errors = 0
    validation_warnings = 0

    try:
        from apps.talento.models import Employee
        total_employees = Employee.objects.filter(entity_id__in=entity_ids).count()
    except Exception:
        pass

    try:
        from apps.reten.models import ProtectedEmployee
        total_protected = ProtectedEmployee.objects.filter(entity_id__in=entity_ids, active=True).count()
    except Exception:
        pass

    try:
        from apps.planta.models import PayrollPlan, PayrollPosition
        from django.db.models import Sum, Count

        current_plans = PayrollPlan.objects.filter(
            entity_id__in=entity_ids, kind='CURRENT'
        )
        proposed_plans = PayrollPlan.objects.filter(
            entity_id__in=entity_ids, kind='PROPOSED'
        )
        agg_current = PayrollPosition.objects.filter(
            plan__in=current_plans
        ).aggregate(total=Sum('quantity'))
        agg_proposed = PayrollPosition.objects.filter(
            plan__in=proposed_plans
        ).aggregate(total=Sum('quantity'))

        total_positions_current = agg_current.get('total') or 0
        total_positions_proposed = agg_proposed.get('total') or 0
    except Exception:
        pass

    try:
        from apps.analisis.validators import validate_restructuring
        for r in restructurings_qs:
            findings = validate_restructuring(r)
            validation_errors += len([f for f in findings if f.get('severity') == 'error'])
            validation_warnings += len([f for f in findings if f.get('severity') == 'warning'])
    except Exception:
        pass

    # Consultas próximas a vencer (sin response_at y con sent_at)
    upcoming_consultations = []
    try:
        from apps.consultas.models import OfficialConsultation
        from apps.consultas.services import days_until_expiration
        pending_consultations = OfficialConsultation.objects.filter(
            restructuring__entity_id__in=entity_ids,
            response_at__isnull=True,
            sent_at__isnull=False,
        ).select_related('restructuring').order_by('sent_at')[:10]

        for c in pending_consultations:
            days = days_until_expiration(c)
            if days is not None and days <= 10:
                upcoming_consultations.append({
                    'id': c.id,
                    'entity_target': c.entity_target,
                    'subject': c.subject,
                    'sent_at': c.sent_at.isoformat() if c.sent_at else None,
                    'days_pending': days,
                })
    except Exception:
        pass

    summary = {
        'total_restructurings': len(restructurings_data),
        'by_status': by_status,
        'total_employees': total_employees,
        'total_protected': total_protected,
        'total_positions_current': total_positions_current,
        'total_positions_proposed': total_positions_proposed,
        'validation_errors': validation_errors,
        'validation_warnings': validation_warnings,
        'upcoming_consultations': upcoming_consultations,
    }

    # ---- Per-restructuring (solo si hay entity_filter) ----
    per_restructuring = []
    if entity_id:
        for r in restructurings_qs:
            detail = _build_restructuring_detail(r)
            per_restructuring.append(detail)

    return Response({
        'restructurings': restructurings_data,
        'summary': summary,
        'per_restructuring': per_restructuring,
    })


def _build_restructuring_detail(restructuring) -> dict:
    """Construye el detalle por reestructuración para el dashboard."""
    detail: dict = {
        'restructuring_id': restructuring.id,
        'name': restructuring.name,
        'modules_complete_pct': 0.0,
        'validation': {'errors': 0, 'warnings': 0, 'info': 0},
        'cost_current': 0.0,
        'cost_proposed': 0.0,
        'cost_delta': 0.0,
        'law_617_current': None,
        'law_617_projected': None,
        'positions_delta': 0,
        'protected_count': 0,
    }

    entity = restructuring.entity

    # Conteo de módulos con datos (simplificado: 8 módulos posibles)
    modules_with_data = 0
    total_modules = 8

    try:
        from apps.diagnostico.models import Diagnosis
        if Diagnosis.objects.filter(entity=entity).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.planta.models import PayrollPlan
        if PayrollPlan.objects.filter(restructuring=restructuring).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.procesos.models import ProcessMap
        if ProcessMap.objects.filter(entity=entity).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.mfmp.models import MFMP
        if MFMP.objects.filter(entity=entity).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.talento.models import Employee
        if Employee.objects.filter(entity=entity).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.cargas.models import WorkloadMatrix
        if WorkloadMatrix.objects.filter(entity=entity).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.mandatos.models import LegalMandate
        if LegalMandate.objects.filter(entity=entity).exists():
            modules_with_data += 1
    except Exception:
        pass

    try:
        from apps.reten.models import ProtectedEmployee
        count = ProtectedEmployee.objects.filter(entity=entity, active=True).count()
        detail['protected_count'] = count
        if count > 0:
            modules_with_data += 1
    except Exception:
        pass

    detail['modules_complete_pct'] = round(modules_with_data / total_modules * 100, 1)

    # Validación
    try:
        from apps.analisis.validators import validate_restructuring
        findings = validate_restructuring(restructuring)
        detail['validation'] = {
            'errors': len([f for f in findings if f.get('severity') == 'error']),
            'warnings': len([f for f in findings if f.get('severity') == 'warning']),
            'info': len([f for f in findings if f.get('severity') == 'info']),
        }
    except Exception:
        pass

    # Costos de planta
    try:
        from apps.planta.models import PayrollPlan
        from apps.nomina.services import calculate_payroll_total

        current_plan = PayrollPlan.objects.filter(
            restructuring=restructuring, kind='CURRENT'
        ).first()
        proposed_plan = PayrollPlan.objects.filter(
            restructuring=restructuring, kind='PROPOSED'
        ).last()

        pos_current = 0
        pos_proposed = 0

        if current_plan:
            totals = calculate_payroll_total(current_plan)
            detail['cost_current'] = totals['annual_effective']
            pos_current = totals['position_count']

        if proposed_plan:
            totals = calculate_payroll_total(proposed_plan)
            detail['cost_proposed'] = totals['annual_effective']
            pos_proposed = totals['position_count']

        detail['cost_delta'] = round(detail['cost_proposed'] - detail['cost_current'], 2)
        detail['positions_delta'] = pos_proposed - pos_current
    except Exception:
        pass

    # Ley 617
    try:
        from apps.mfmp.models import MFMP
        from apps.mfmp.services import calculate_law_617_by_year, simulate_plan_impact
        from datetime import date

        mfmp = MFMP.objects.filter(entity=entity).order_by('-base_year').first()
        if mfmp:
            by_year = calculate_law_617_by_year(mfmp)
            current_year = date.today().year
            year_key = current_year if current_year in by_year else mfmp.base_year
            year_data = by_year.get(year_key, {})
            detail['law_617_current'] = year_data.get('compliant', True)

            # Proyectado con la planta propuesta
            proposed_plan = PayrollPlan.objects.filter(
                restructuring=restructuring, kind='PROPOSED'
            ).last()
            if proposed_plan:
                sim = simulate_plan_impact(mfmp, proposed_plan)
                detail['law_617_projected'] = len(sim['broken_years_617']) == 0
    except Exception:
        pass

    return detail
