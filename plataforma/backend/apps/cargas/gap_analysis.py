"""
Análisis de brechas de personal.

Cruza automáticamente:
- Cargas laborales calculadas (HH necesarias) vs planta actual (HH disponibles)
- Contratistas OPS/CPS como recurso no-planta
- Por dependencia y nivel jerárquico

Genera semáforo: VERDE (suficiente), AMARILLO (ajustado), ROJO (déficit).
"""
import math
from decimal import Decimal
from django.db.models import Sum, Count, Q

from apps.cargas.models import WorkloadMatrix, WorkloadEntry, HOURS_PER_MONTH
from apps.planta.models import PayrollPlan, PayrollPosition
from apps.core.models import Department


def analyze_gaps(matrix_id, current_plan_id=None, include_contractors=True):
    """
    Análisis completo de brechas para una matriz de cargas.

    Returns dict con:
    - by_department: brechas por dependencia
    - by_level: brechas por nivel jerárquico
    - totals: resumen general
    - alerts: alertas y recomendaciones
    """
    matrix = WorkloadMatrix.objects.select_related('entity').get(id=matrix_id)
    entity = matrix.entity

    # Buscar planta actual si no se especifica
    if current_plan_id:
        current_plan = PayrollPlan.objects.get(id=current_plan_id)
    else:
        current_plan = PayrollPlan.objects.filter(
            entity=entity,
            restructuring=matrix.restructuring,
            kind='CURRENT',
        ).first()

    # Cargas por dependencia y nivel
    entries = WorkloadEntry.objects.filter(matrix=matrix)
    workload_data = _aggregate_workload(entries)

    # Planta actual por dependencia y nivel
    plant_data = _aggregate_plant(current_plan) if current_plan else {}

    # Contratistas
    contractor_data = {}
    if include_contractors:
        contractor_data = _aggregate_contractors(entity, matrix.restructuring_id)

    # Calcular brechas
    departments = Department.objects.filter(entity=entity).order_by('name')
    levels = ['ASESOR', 'PROFESIONAL', 'TECNICO', 'ASISTENCIAL']

    by_department = []
    for dept in departments:
        dept_key = dept.id
        dept_row = {
            'department_id': dept.id,
            'department_name': dept.name,
            'levels': {},
            'total_hours_needed': 0,
            'total_positions_needed': 0,
            'total_positions_current': 0,
            'total_contractors': 0,
            'total_gap': 0,
        }
        for level in levels:
            key = (dept_key, level)
            hours_needed = workload_data.get(key, {}).get('hours', 0)
            positions_needed = math.ceil(hours_needed / float(HOURS_PER_MONTH)) if hours_needed > 0 else 0
            positions_current = plant_data.get(key, {}).get('quantity', 0)
            contractors = contractor_data.get(key, {}).get('count', 0)
            contractor_hours = contractor_data.get(key, {}).get('hours', 0)

            gap = positions_needed - positions_current
            gap_with_contractors = positions_needed - positions_current - contractors

            if gap <= 0:
                semaphore = 'VERDE'
            elif gap_with_contractors <= 0:
                semaphore = 'AMARILLO'
            else:
                semaphore = 'ROJO'

            level_data = {
                'hours_needed': round(hours_needed, 2),
                'positions_needed': positions_needed,
                'positions_current': positions_current,
                'contractors': contractors,
                'contractor_hours': round(contractor_hours, 2),
                'gap': gap,
                'gap_with_contractors': gap_with_contractors,
                'semaphore': semaphore,
            }
            dept_row['levels'][level] = level_data
            dept_row['total_hours_needed'] += hours_needed
            dept_row['total_positions_needed'] += positions_needed
            dept_row['total_positions_current'] += positions_current
            dept_row['total_contractors'] += contractors

        dept_row['total_gap'] = dept_row['total_positions_needed'] - dept_row['total_positions_current']
        dept_row['total_hours_needed'] = round(dept_row['total_hours_needed'], 2)

        # Solo incluir dependencias con datos
        if dept_row['total_hours_needed'] > 0 or dept_row['total_positions_current'] > 0:
            by_department.append(dept_row)

    # Totales por nivel
    by_level = {}
    for level in levels:
        hours = sum(d['levels'].get(level, {}).get('hours_needed', 0) for d in by_department)
        needed = sum(d['levels'].get(level, {}).get('positions_needed', 0) for d in by_department)
        current = sum(d['levels'].get(level, {}).get('positions_current', 0) for d in by_department)
        contrs = sum(d['levels'].get(level, {}).get('contractors', 0) for d in by_department)
        gap = needed - current
        by_level[level] = {
            'hours_needed': round(hours, 2),
            'positions_needed': needed,
            'positions_current': current,
            'contractors': contrs,
            'gap': gap,
            'semaphore': 'VERDE' if gap <= 0 else ('AMARILLO' if gap - contrs <= 0 else 'ROJO'),
        }

    # Totales generales
    total_needed = sum(v['positions_needed'] for v in by_level.values())
    total_current = sum(v['positions_current'] for v in by_level.values())
    total_contractors = sum(v['contractors'] for v in by_level.values())
    total_gap = total_needed - total_current

    totals = {
        'total_positions_needed': total_needed,
        'total_positions_current': total_current,
        'total_contractors': total_contractors,
        'total_gap': total_gap,
        'total_gap_with_contractors': total_gap - total_contractors,
        'coverage_pct': round(total_current / total_needed * 100, 1) if total_needed else 100,
        'semaphore': 'VERDE' if total_gap <= 0 else ('AMARILLO' if total_gap - total_contractors <= 0 else 'ROJO'),
    }

    # Alertas
    alerts = _build_gap_alerts(by_department, by_level, totals, contractor_data)

    return {
        'matrix_id': matrix.id,
        'matrix_name': matrix.name,
        'entity_name': entity.name,
        'current_plan_id': current_plan.id if current_plan else None,
        'current_plan_name': current_plan.name if current_plan else 'Sin planta actual',
        'by_department': by_department,
        'by_level': by_level,
        'totals': totals,
        'alerts': alerts,
    }


def _aggregate_workload(entries):
    """Agrega horas de la matriz por (department_id, level)."""
    data = {}
    rows = entries.values('department_id', 'hierarchy_level').annotate(
        total_hours=Sum('hh_month'),
        count=Count('id'),
    )
    for row in rows:
        key = (row['department_id'], row['hierarchy_level'])
        data[key] = {
            'hours': float(row['total_hours'] or 0),
            'entries': row['count'],
        }
    return data


def _aggregate_plant(plan):
    """Agrega cargos de planta por (department_id, level)."""
    data = {}
    positions = PayrollPosition.objects.filter(plan=plan)

    # Para planta global, distribuir por departamento si tiene department
    rows = positions.values('department_id', 'hierarchy_level').annotate(
        total_quantity=Sum('quantity'),
        total_salary=Sum('monthly_salary'),
    )
    for row in rows:
        dept_id = row['department_id']
        if dept_id is None:
            continue
        key = (dept_id, row['hierarchy_level'])
        data[key] = {
            'quantity': row['total_quantity'] or 0,
            'salary': float(row['total_salary'] or 0),
        }
    return data


def _aggregate_contractors(entity, restructuring_id):
    """Agrega contratistas por (department_id, level sugerido)."""
    from apps.contratistas.models import Contractor
    data = {}
    contractors = Contractor.objects.filter(
        entity=entity,
        restructuring_id=restructuring_id,
        is_active=True,
    )
    for c in contractors:
        level = c.suggested_hierarchy_level or 'PROFESIONAL'
        key = (c.department_id, level)
        if key not in data:
            data[key] = {'count': 0, 'hours': 0}
        data[key]['count'] += 1
        # Estimar horas: usar sum de actividades o 167 por defecto
        hours = c.activities.aggregate(total=Sum('estimated_hours_month'))['total']
        data[key]['hours'] += float(hours or HOURS_PER_MONTH)
    return data


def _build_gap_alerts(by_department, by_level, totals, contractor_data):
    alerts = []

    if totals['total_gap'] > 0:
        alerts.append({
            'level': 'error',
            'message': f'Déficit de {totals["total_gap"]} cargo(s) respecto a las cargas calculadas.',
        })
    elif totals['total_gap'] < 0:
        alerts.append({
            'level': 'info',
            'message': f'La planta actual tiene {abs(totals["total_gap"])} cargo(s) por encima de lo calculado.',
        })

    if totals['total_contractors'] > 0 and totals['total_gap'] > 0:
        if totals['total_gap_with_contractors'] <= 0:
            alerts.append({
                'level': 'warning',
                'message': f'El déficit se cubre con {totals["total_contractors"]} contratista(s), '
                           f'pero esto puede implicar desnaturalización contractual.',
            })

    # Departamentos en rojo
    red_depts = [d for d in by_department if d['total_gap'] > 2]
    if red_depts:
        names = ', '.join(d['department_name'] for d in red_depts[:5])
        alerts.append({
            'level': 'warning',
            'message': f'Dependencias con mayor déficit: {names}.',
        })

    return alerts
