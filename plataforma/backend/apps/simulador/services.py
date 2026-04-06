"""
Sprint 6 — Servicios del simulador de escenarios.

clone_plan_to_scenario: clona un PayrollPlan con todas sus posiciones.
evaluate_scenario: calcula métricas del escenario.
compare_scenarios: comparación N-aria de escenarios evaluados.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.simulador.models import Scenario
    from apps.planta.models import PayrollPlan


def clone_plan_to_scenario(plan: 'PayrollPlan', restructuring, scenario_name: str) -> 'Scenario':
    """
    1. Clona el PayrollPlan y todas sus PayrollPositions (deep copy con nuevo pk).
    2. Crea un Scenario con el nuevo plan.
    3. Devuelve el Scenario.
    """
    from apps.planta.models import PayrollPlan, PayrollPosition
    from apps.simulador.models import Scenario

    # Clonar el plan
    new_plan = PayrollPlan(
        entity=plan.entity,
        restructuring=restructuring,
        kind=plan.kind,
        structure=plan.structure,
        name=f'{plan.name} (escenario: {scenario_name})',
        reference_date=plan.reference_date,
        adopted_by=plan.adopted_by,
        notes=f'Clonado desde plan #{plan.pk} para escenario "{scenario_name}".',
    )
    new_plan.save()

    # Clonar posiciones
    for pos in plan.positions.all():
        PayrollPosition.objects.create(
            plan=new_plan,
            department=pos.department,
            hierarchy_level=pos.hierarchy_level,
            denomination=pos.denomination,
            code=pos.code,
            grade=pos.grade,
            quantity=pos.quantity,
            monthly_salary=pos.monthly_salary,
            notes=pos.notes,
            occupant=pos.occupant,
        )

    # Crear escenario
    scenario = Scenario.objects.create(
        restructuring=restructuring,
        name=scenario_name,
        description=f'Clonado desde plan: {plan}',
        parent=None,
        is_baseline=False,
        payroll_plan=new_plan,
        cached_metrics={},
    )
    return scenario


def evaluate_scenario(scenario: 'Scenario') -> dict:
    """
    Calcula las métricas del escenario:
    - total_positions: cantidad de posiciones en el plan.
    - total_monthly_base: suma de monthly_salary.
    - total_monthly_effective: suma con factor prestacional.
    - total_annual: anual efectivo.
    - law_617_current_year: indicador Ley 617 para el año actual.
    - law_617_years_broken: cuántos años del MFMP rompe límite.
    - mandate_coverage_pct: % mandatos cubiertos.
    - eligibility_pct: % posiciones cubiertas por al menos un empleado.

    Guarda resultado en scenario.cached_metrics y devuelve dict.
    """
    from apps.nomina.services import calculate_payroll_total
    from apps.mfmp.models import MFMP
    from apps.mfmp.services import simulate_plan_impact, calculate_law_617_by_year
    from apps.mandatos.services import gap_report

    plan = scenario.payroll_plan
    restructuring = scenario.restructuring
    entity = restructuring.entity

    metrics: dict = {}

    if plan is not None:
        totals = calculate_payroll_total(plan)
        metrics['total_positions'] = totals['position_count']
        metrics['total_monthly_base'] = totals['monthly_base']
        metrics['total_monthly_effective'] = totals['monthly_effective']
        metrics['total_annual'] = totals['annual_effective']
    else:
        metrics['total_positions'] = 0
        metrics['total_monthly_base'] = 0.0
        metrics['total_monthly_effective'] = 0.0
        metrics['total_annual'] = 0.0

    # Ley 617 — buscar MFMP asociado
    mfmp = MFMP.objects.filter(entity=entity).order_by('-base_year').first()
    current_year = date.today().year

    if mfmp is not None and plan is not None:
        try:
            sim = simulate_plan_impact(mfmp, plan)
            simulated_617 = sim['simulated']['law_617']
            # Año actual o primer año del MFMP
            year_key = str(current_year) if str(current_year) in simulated_617 else str(mfmp.base_year)
            year_data = simulated_617.get(year_key, {})
            metrics['law_617_current_year'] = year_data.get('compliant', True)
            metrics['law_617_years_broken'] = len(sim['broken_years_617'])
        except Exception:
            metrics['law_617_current_year'] = None
            metrics['law_617_years_broken'] = 0
    elif mfmp is not None:
        try:
            by_year = calculate_law_617_by_year(mfmp)
            year_key = current_year if current_year in by_year else mfmp.base_year
            year_data = by_year.get(year_key, {})
            metrics['law_617_current_year'] = year_data.get('compliant', True)
            metrics['law_617_years_broken'] = 0
        except Exception:
            metrics['law_617_current_year'] = None
            metrics['law_617_years_broken'] = 0
    else:
        metrics['law_617_current_year'] = None
        metrics['law_617_years_broken'] = 0

    # Mandatos
    try:
        gap = gap_report(entity)
        stats = gap.get('coverage_stats', {})
        full = stats.get('full', 0)
        partial = stats.get('partial', 0)
        none_cov = stats.get('none', 0)
        untracked = stats.get('untracked', 0)
        total_mandates = full + partial + none_cov + untracked
        if total_mandates > 0:
            metrics['mandate_coverage_pct'] = round(
                (full + partial) / total_mandates * 100, 1
            )
        else:
            metrics['mandate_coverage_pct'] = 100.0
    except Exception:
        metrics['mandate_coverage_pct'] = None

    # Elegibilidad simplificada: % posiciones con al menos un ocupante
    if plan is not None:
        positions = list(plan.positions.all())
        total_pos = len(positions)
        if total_pos > 0:
            covered = sum(1 for p in positions if p.occupant_id is not None)
            metrics['eligibility_pct'] = round(covered / total_pos * 100, 1)
        else:
            metrics['eligibility_pct'] = 0.0
    else:
        metrics['eligibility_pct'] = 0.0

    # Guardar en caché
    scenario.cached_metrics = metrics
    scenario.save(update_fields=['cached_metrics', 'updated_at'])

    return metrics


def compare_scenarios(scenarios: list) -> dict:
    """
    Toma N escenarios evaluados y devuelve comparación lado a lado.

    {
      'scenarios': [{name, metrics...}, ...],
      'rankings': {
        'by_cost': [scenario_id ordered asc],
        'by_law_617_compliance': [scenario_id ordered desc por años sin romper],
        'by_positions': [scenario_id ordered asc],
      }
    }
    """
    scenario_list = []
    for s in scenarios:
        metrics = s.cached_metrics or {}
        scenario_list.append({
            'id': s.id,
            'name': s.name,
            'is_baseline': s.is_baseline,
            'metrics': metrics,
        })

    # Rankings
    by_cost = sorted(
        scenario_list,
        key=lambda x: x['metrics'].get('total_annual', float('inf'))
    )
    by_law_617 = sorted(
        scenario_list,
        key=lambda x: x['metrics'].get('law_617_years_broken', 0)
    )
    by_positions = sorted(
        scenario_list,
        key=lambda x: x['metrics'].get('total_positions', 0)
    )

    return {
        'scenarios': scenario_list,
        'rankings': {
            'by_cost': [s['id'] for s in by_cost],
            'by_law_617_compliance': [s['id'] for s in by_law_617],
            'by_positions': [s['id'] for s in by_positions],
        },
    }
