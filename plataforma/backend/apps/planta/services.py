"""
Comparativo planta actual vs propuesta.

Agrupa por (código, grado, denominación) para mostrar deltas por cargo.
Entrega totales por nivel jerárquico y por plan, y el delta global de costo.
"""
from collections import defaultdict
from decimal import Decimal
from typing import Any

from .models import PayrollPlan, PayrollPosition


def _plan_summary(plan: PayrollPlan) -> dict[str, Any]:
    positions = list(plan.positions.all())
    total_qty = sum(p.quantity for p in positions)
    total_monthly = sum((p.total_monthly for p in positions), Decimal('0'))
    by_level_qty: dict[str, int] = defaultdict(int)
    by_level_monthly: dict[str, Decimal] = defaultdict(lambda: Decimal('0'))
    for p in positions:
        by_level_qty[p.hierarchy_level] += p.quantity
        by_level_monthly[p.hierarchy_level] += p.total_monthly
    return {
        'plan_id': plan.id,
        'name': plan.name,
        'kind': plan.kind,
        'reference_date': plan.reference_date.isoformat(),
        'total_positions': total_qty,
        'total_monthly': float(total_monthly),
        'total_annual': float(total_monthly * 12),
        'by_level': {
            lvl: {'positions': by_level_qty[lvl], 'monthly': float(by_level_monthly[lvl])}
            for lvl in by_level_qty
        },
    }


def compare_plans(current: PayrollPlan, proposed: PayrollPlan) -> dict[str, Any]:
    """
    Retorna un comparativo por cargo (código+grado+denominación) con:
    - cantidad en actual
    - cantidad en propuesta
    - delta cantidad
    - costo mensual en cada plan y delta
    """
    if current.entity_id != proposed.entity_id:
        raise ValueError('Los planes deben pertenecer a la misma entidad.')

    def _key(p: PayrollPosition) -> tuple[str, str, str, str]:
        return (p.hierarchy_level, p.code or '', p.grade or '', p.denomination)

    current_by_key: dict[tuple, list[PayrollPosition]] = defaultdict(list)
    proposed_by_key: dict[tuple, list[PayrollPosition]] = defaultdict(list)

    for p in current.positions.all():
        current_by_key[_key(p)].append(p)
    for p in proposed.positions.all():
        proposed_by_key[_key(p)].append(p)

    all_keys = sorted(set(current_by_key.keys()) | set(proposed_by_key.keys()))
    rows: list[dict[str, Any]] = []
    for key in all_keys:
        level, code, grade, denomination = key
        cur = current_by_key.get(key, [])
        prop = proposed_by_key.get(key, [])
        cur_qty = sum(x.quantity for x in cur)
        prop_qty = sum(x.quantity for x in prop)
        cur_monthly = sum((x.total_monthly for x in cur), Decimal('0'))
        prop_monthly = sum((x.total_monthly for x in prop), Decimal('0'))
        # Salario unitario: el de cualquiera que exista (debería coincidir por código+grado)
        unit_salary = (cur[0].monthly_salary if cur else prop[0].monthly_salary) if (cur or prop) else Decimal('0')
        rows.append({
            'hierarchy_level': level,
            'code': code,
            'grade': grade,
            'denomination': denomination,
            'unit_salary': float(unit_salary),
            'current_quantity': cur_qty,
            'proposed_quantity': prop_qty,
            'delta_quantity': prop_qty - cur_qty,
            'current_monthly': float(cur_monthly),
            'proposed_monthly': float(prop_monthly),
            'delta_monthly': float(prop_monthly - cur_monthly),
        })

    cur_summary = _plan_summary(current)
    prop_summary = _plan_summary(proposed)
    return {
        'entity_id': current.entity_id,
        'current': cur_summary,
        'proposed': prop_summary,
        'delta': {
            'positions': prop_summary['total_positions'] - cur_summary['total_positions'],
            'monthly': prop_summary['total_monthly'] - cur_summary['total_monthly'],
            'annual': prop_summary['total_annual'] - cur_summary['total_annual'],
        },
        'rows': rows,
    }
