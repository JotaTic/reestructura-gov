"""
Services — Motor de elegibilidad (Sprint 4).

Evalúa si un empleado cumple los requisitos para ser promovido a un nivel/código/grado
destino, aplicando equivalencias del Decreto 785/2005.
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from .equivalencias import EDUCATION_ORDER, EQUIVALENCIAS, LEVEL_REQUIREMENTS
from .schemas import EligibilityStatus, PromotionEligibility

if TYPE_CHECKING:
    from apps.talento.models import Employee
    from apps.core.models import Entity


def _education_rank(level: str) -> int:
    """Devuelve el índice del nivel en la escala; -1 si no existe."""
    try:
        return EDUCATION_ORDER.index(level)
    except ValueError:
        return -1


def _highest_education(employee: 'Employee') -> Optional_str:
    """Devuelve el nivel de educación más alto alcanzado por el empleado."""
    best_rank = -1
    best_level = None
    for edu in employee.education.all():
        r = _education_rank(edu.level)
        if r > best_rank:
            best_rank = r
            best_level = edu.level
    return best_level


def _public_experience_years(employee: 'Employee') -> float:
    """Suma de años de experiencia en sector público."""
    today = date.today()
    total_days = 0
    for exp in employee.experience.filter(is_public_sector=True):
        end = exp.end_date or today
        delta = (end - exp.start_date).days
        if delta > 0:
            total_days += delta
    return round(total_days / 365.25, 2)


# Hack: annotate type alias manually
Optional_str = type(None) | str


def analyze_promotion_eligibility(
    employee: 'Employee',
    target_level: str,
    target_code: str,
    target_grade: str,
) -> PromotionEligibility:
    """
    1. Lee requisitos mínimos del target_level desde LEVEL_REQUIREMENTS.
    2. Evalúa EmployeeEducation: nivel más alto alcanzado.
    3. Evalúa EmployeeExperience: suma de años is_public_sector=True.
    4. Si cumple directo → ELEGIBLE.
    5. Si no, prueba EQUIVALENCIAS aplicables al target_level.
    6. Si alguna equivalencia cuadra considerando años extra → ELEGIBLE_POR_EQUIVALENCIA.
    7. Si no, NO_ELEGIBLE con gap + path_to_qualify.
    Devuelve PromotionEligibility.
    """
    reqs = LEVEL_REQUIREMENTS.get(target_level.upper())
    if reqs is None:
        return PromotionEligibility(
            employee_id=employee.id,
            employee_name=employee.full_name,
            target_level=target_level,
            target_code=target_code,
            target_grade=target_grade,
            status='NO_ELEGIBLE',
            gap=[f'Nivel destino desconocido: {target_level}'],
            path_to_qualify=[],
        )

    min_edu = reqs['min_education']
    min_exp = reqs['min_experience_years']

    highest_edu = _highest_education(employee)
    pub_exp_years = _public_experience_years(employee)

    edu_rank = _education_rank(highest_edu) if highest_edu else -1
    min_edu_rank = _education_rank(min_edu)

    meets_edu = edu_rank >= min_edu_rank
    meets_exp = pub_exp_years >= min_exp

    if meets_edu and meets_exp:
        return PromotionEligibility(
            employee_id=employee.id,
            employee_name=employee.full_name,
            target_level=target_level,
            target_code=target_code,
            target_grade=target_grade,
            status='ELEGIBLE',
            matched_education=highest_edu,
            total_public_experience_years=pub_exp_years,
        )

    # Intentar equivalencias
    for eq in EQUIVALENCIAS:
        if target_level.upper() not in [l.upper() for l in eq['applies_to']]:
            continue
        # El empleado debe tener el nivel "have" o superior
        have_rank = _education_rank(eq['have'])
        if edu_rank < have_rank:
            continue
        # La equivalencia eleva la educación a "grants"
        grants_rank = _education_rank(eq['grants'])
        extra_exp = eq['extra_experience_years']
        # Con la equivalencia, el nivel educativo efectivo = grants
        eff_edu_ok = grants_rank >= min_edu_rank
        # La experiencia requerida = min_exp + extra_exp (años que compensa la eq)
        eff_exp_ok = pub_exp_years >= (min_exp + extra_exp)
        if eff_edu_ok and eff_exp_ok:
            return PromotionEligibility(
                employee_id=employee.id,
                employee_name=employee.full_name,
                target_level=target_level,
                target_code=target_code,
                target_grade=target_grade,
                status='ELEGIBLE_POR_EQUIVALENCIA',
                matched_education=highest_edu,
                total_public_experience_years=pub_exp_years,
                equivalence_applied=(
                    f'{eq["have"]} + {extra_exp} años exp. → equivale a {eq["grants"]}'
                ),
            )

    # No elegible: calcular gaps
    gap = []
    path = []
    if not meets_edu:
        gap.append(
            f'Educación insuficiente: tiene {highest_edu or "ninguna"}, '
            f'requiere {min_edu} o superior.'
        )
        path.append(
            f'Completar programa de {min_edu} para el nivel {target_level}.'
        )
    if not meets_exp:
        falta = round(min_exp - pub_exp_years, 1)
        gap.append(
            f'Experiencia pública insuficiente: tiene {pub_exp_years:.1f} años, '
            f'requiere {min_exp} años.'
        )
        path.append(
            f'Acumular {falta} años adicionales de experiencia en sector público.'
        )

    return PromotionEligibility(
        employee_id=employee.id,
        employee_name=employee.full_name,
        target_level=target_level,
        target_code=target_code,
        target_grade=target_grade,
        status='NO_ELEGIBLE',
        gap=gap,
        path_to_qualify=path,
        matched_education=highest_edu,
        total_public_experience_years=pub_exp_years,
    )


def bulk_analyze_level(entity: 'Entity', from_level: str, to_level: str) -> dict:
    """
    Aplica el motor a todos los Employee de la entidad que tengan al menos un
    EmploymentRecord activo en una PayrollPosition del from_level.
    Retorna {
      'total_analyzed': n,
      'eligible_direct': n,
      'eligible_by_equivalence': n,
      'not_eligible': n,
      'results': [PromotionEligibility, ...],  # serializable (dataclass → asdict)
    }
    """
    from apps.talento.models import Employee, EmploymentRecord

    # Empleados con vinculación activa en una posición del from_level
    employee_ids = (
        EmploymentRecord.objects
        .filter(
            entity=entity,
            is_active=True,
            position__hierarchy_level=from_level.upper(),
        )
        .values_list('employee_id', flat=True)
        .distinct()
    )

    employees = Employee.objects.filter(
        entity=entity, id__in=employee_ids
    ).prefetch_related('education', 'experience')

    results = []
    eligible_direct = 0
    eligible_by_eq = 0
    not_eligible = 0

    for emp in employees:
        result = analyze_promotion_eligibility(emp, to_level, '', '')
        results.append(result)
        if result.status == 'ELEGIBLE':
            eligible_direct += 1
        elif result.status == 'ELEGIBLE_POR_EQUIVALENCIA':
            eligible_by_eq += 1
        else:
            not_eligible += 1

    return {
        'total_analyzed': len(results),
        'eligible_direct': eligible_direct,
        'eligible_by_equivalence': eligible_by_eq,
        'not_eligible': not_eligible,
        'results': [asdict(r) for r in results],
    }


def estimate_salary_increase_cost(
    employees,
    target_level: str,
    target_code: str,
    target_grade: str,
    entity: 'Entity',
) -> dict:
    """
    Calcula cuánto costaría pasar a los empleados al nivel/grado destino.
    1. Busca SalaryScale para el target (order de la entidad + año actual + nivel/código/grado).
    2. Calcula nuevo base salary y nuevo costo efectivo mensual usando nomina.services.
    3. Diferencial = (nuevo_mensual - actual_mensual) × 12 × cantidad de empleados, + factor prestacional.
    Retorna {'employees_count', 'current_monthly_avg', 'new_monthly_avg', 'annual_delta', 'monthly_delta'}.
    """
    from datetime import date as _date
    from apps.nomina.models import SalaryScale
    from apps.nomina.services import get_prestational_factor
    from apps.talento.models import EmploymentRecord

    current_year = _date.today().year
    entity_order = getattr(entity, 'order', 'MUNICIPAL')

    # Buscar la escala salarial para el target
    scale_entry = SalaryScale.objects.filter(
        order=entity_order,
        year=current_year,
        level=target_level.upper(),
        code=target_code,
        grade=target_grade,
    ).first()

    if scale_entry is None:
        # Fallback: cualquier registro del nivel
        scale_entry = SalaryScale.objects.filter(
            order=entity_order,
            year=current_year,
            level=target_level.upper(),
        ).order_by('grade').first()

    new_base = Decimal(str(scale_entry.base_salary)) if scale_entry else Decimal('0')

    fp = get_prestational_factor(entity)
    factor = fp.factor if fp else Decimal('1.62')
    new_monthly = (new_base * factor).quantize(Decimal('0.01'))

    # Calcular salario actual promedio de los empleados
    total_current = Decimal('0')
    count = 0
    for emp in employees:
        rec = EmploymentRecord.objects.filter(
            employee=emp, is_active=True, entity=entity,
        ).select_related('position').first()
        if rec and rec.position and rec.position.monthly_salary:
            total_current += Decimal(str(rec.position.monthly_salary)) * factor
            count += 1

    employees_count = len(list(employees)) if hasattr(employees, '__iter__') else count
    current_monthly_avg = float(
        (total_current / count).quantize(Decimal('0.01'))
    ) if count else 0.0
    monthly_delta = float((new_monthly - Decimal(str(current_monthly_avg))).quantize(Decimal('0.01')))
    annual_delta = float((Decimal(str(monthly_delta)) * 12 * employees_count).quantize(Decimal('0.01')))

    return {
        'employees_count': employees_count,
        'current_monthly_avg': current_monthly_avg,
        'new_monthly_avg': float(new_monthly),
        'annual_delta': annual_delta,
        'monthly_delta': monthly_delta,
    }
