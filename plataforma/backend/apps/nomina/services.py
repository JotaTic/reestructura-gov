"""
Servicios de negocio para el módulo de Escala salarial (M16).

Cálculos de costo efectivo de nómina considerando factor prestacional.

Fórmulas:
- Costo mensual efectivo = salario_base × factor_prestacional
- Costo anual efectivo = costo_mensual_efectivo × 12

El factor prestacional encapsula todas las cargas laborales adicionales
(prima servicios, vacaciones, cesantías, intereses, navidad, aportes
parafiscales, seguridad social empleador, etc.).
"""
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.planta.models import PayrollPlan, PayrollPosition
    from apps.nomina.models import PrestationalFactor


def get_prestational_factor(entity) -> 'PrestationalFactor':
    """
    Devuelve el PrestationalFactor vigente para la entidad.

    Si la entidad tiene EntitySalaryConfig, usa su régimen y año.
    Si no, usa TERRITORIAL_GENERAL del año actual.
    """
    from datetime import date
    from apps.nomina.models import PrestationalFactor, EntitySalaryConfig

    current_year = date.today().year

    try:
        config = EntitySalaryConfig.objects.get(entity=entity)
        regime = config.regime
        year = config.base_scale_year
    except EntitySalaryConfig.DoesNotExist:
        regime = 'TERRITORIAL_GENERAL'
        year = current_year

    # Buscar factor del año exacto, o el más reciente disponible
    factor = PrestationalFactor.objects.filter(regime=regime, year__lte=year).order_by('-year').first()
    if factor is None:
        # Fallback: cualquier factor territorial
        factor = PrestationalFactor.objects.filter(regime='TERRITORIAL_GENERAL').order_by('-year').first()
    if factor is None:
        # Fallback extremo: crear uno en memoria con el default
        fake = PrestationalFactor()
        fake.factor = Decimal('1.62')
        fake.regime = 'TERRITORIAL_GENERAL'
        fake.year = current_year
        fake.detail = {}
        return fake
    return factor


def calculate_effective_monthly_cost(position: 'PayrollPosition', entity=None) -> Decimal:
    """
    Calcula el costo mensual efectivo de un cargo.

    Costo = salario_base × factor_prestacional.
    Si position.monthly_salary es None o 0, retorna Decimal('0').
    """
    base = position.monthly_salary or Decimal('0')
    if base == 0:
        return Decimal('0')
    target_entity = entity or (position.plan.entity if hasattr(position, 'plan') else None)
    if target_entity is None:
        factor_value = Decimal('1.62')
    else:
        fp = get_prestational_factor(target_entity)
        factor_value = fp.factor or Decimal('1.62')
    return (Decimal(str(base)) * factor_value).quantize(Decimal('0.01'))


def calculate_annual_cost(position: 'PayrollPosition', entity=None) -> Decimal:
    """
    Calcula el costo anual efectivo de un cargo.

    Costo anual = costo_mensual_efectivo × 12.

    Nota: Esta fórmula es simplificada. Para una estimación más precisa se
    podría sumar primas extraordinarias del JSON detail del PrestationalFactor,
    pero en este sprint se mantiene: annual = effective_monthly × 12.
    El multiplicador de 12 cubre todos los meses incluyendo prima de navidad
    y prima de servicios (ya incluidos en el factor prestacional).
    """
    monthly = calculate_effective_monthly_cost(position, entity)
    return (monthly * 12).quantize(Decimal('0.01'))


def calculate_payroll_total(plan: 'PayrollPlan') -> dict:
    """
    Calcula el costo total de una planta de personal.

    Retorna:
    {
        monthly_base: suma de salarios base mensuales (quantity × monthly_salary),
        monthly_effective: suma del costo mensual con factor prestacional,
        annual_effective: monthly_effective × 12,
        position_count: cantidad total de cargos,
    }
    """
    monthly_base = Decimal('0')
    monthly_effective = Decimal('0')
    position_count = 0

    entity = plan.entity

    for pos in plan.positions.all():
        qty = Decimal(str(pos.quantity or 1))
        base = Decimal(str(pos.monthly_salary or 0))
        effective = calculate_effective_monthly_cost(pos, entity)
        monthly_base += base * qty
        monthly_effective += effective * qty
        position_count += pos.quantity or 1

    annual_effective = (monthly_effective * 12).quantize(Decimal('0.01'))
    return {
        'monthly_base': float(monthly_base.quantize(Decimal('0.01'))),
        'monthly_effective': float(monthly_effective.quantize(Decimal('0.01'))),
        'annual_effective': float(annual_effective),
        'position_count': position_count,
    }


def apply_salary_scale(plan: 'PayrollPlan', scale_year: int) -> int:
    """
    Asigna monthly_salary a los cargos del plan según la escala salarial.

    Busca coincidencia por:
    - order de la entidad del plan (del Entity.order → mapeado a SalaryScale.Order)
    - level = hierarchy_level del cargo
    - code y grade del cargo
    - year = scale_year

    Si no hay coincidencia exacta, intenta solo level + order.
    Retorna la cantidad de cargos actualizados.

    Si la entidad es NACIONAL usa NACIONAL; para cualquier otro orden territorial
    (DEPARTAMENTAL, DISTRITAL, MUNICIPAL) usa TERRITORIAL en la escala si no
    existe uno exacto.
    """
    from apps.nomina.models import SalaryScale
    from apps.planta.models import PayrollPosition

    # Mapear order de entidad a SalaryScale.Order
    entity_order = getattr(plan.entity, 'order', 'MUNICIPAL')
    scale_order_map = {
        'NACIONAL': 'NACIONAL',
        'DEPARTAMENTAL': 'DEPARTAMENTAL',
        'DISTRITAL': 'DISTRITAL',
        'MUNICIPAL': 'MUNICIPAL',
    }
    scale_order = scale_order_map.get(entity_order, 'MUNICIPAL')

    updated = 0
    positions = PayrollPosition.objects.filter(plan=plan)

    for pos in positions:
        # Intentar coincidencia exacta
        qs = SalaryScale.objects.filter(
            order=scale_order,
            year=scale_year,
            level=pos.hierarchy_level,
        )
        if pos.code:
            qs_exact = qs.filter(code=pos.code, grade=pos.grade)
            scale_entry = qs_exact.first()
        else:
            scale_entry = None

        if scale_entry is None:
            # Fallback: primer registro del nivel y orden/año
            scale_entry = qs.order_by('grade').first()

        if scale_entry is not None:
            pos.monthly_salary = scale_entry.base_salary
            pos.save(update_fields=['monthly_salary'])
            updated += 1

    return updated
