"""
Tests para el módulo de Escala salarial (M16).

Cubre:
- calculate_annual_cost: base 3.000.000, factor 1.62 → 3.000.000 × 1.62 × 12 = 58.320.000.
- apply_salary_scale: plan con posiciones → actualiza al menos una.
"""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.core.models import Entity, Restructuring
from apps.nomina.models import SalaryScale, PrestationalFactor, EntitySalaryConfig
from apps.nomina.services import (
    calculate_effective_monthly_cost,
    calculate_annual_cost,
    apply_salary_scale,
)
from apps.planta.models import PayrollPlan, PayrollPosition


def _make_entity(name='Entity Test', order='MUNICIPAL'):
    return Entity.objects.create(
        name=name,
        acronym='ET',
        order=order,
        legal_nature='ALCALDIA',
    )


def _make_restructuring(entity):
    return Restructuring.objects.create(
        entity=entity,
        name='Reestructuración Test',
        reference_date=date(2026, 1, 1),
    )


def _make_payroll_plan(entity, restructuring):
    return PayrollPlan.objects.create(
        entity=entity,
        restructuring=restructuring,
        kind='CURRENT',
        name='Planta Test',
        reference_date=date(2026, 1, 1),
    )


def _make_position(plan, salary, level='PROFESIONAL', code='219', grade='01', qty=1):
    return PayrollPosition.objects.create(
        plan=plan,
        hierarchy_level=level,
        denomination='Profesional Universitario',
        code=code,
        grade=grade,
        quantity=qty,
        monthly_salary=Decimal(str(salary)),
    )


class CalculateAnnualCostTest(TestCase):
    """Tests para calculate_annual_cost con factor prestacional."""

    def setUp(self):
        self.entity = _make_entity()
        self.restructuring = _make_restructuring(self.entity)
        self.plan = _make_payroll_plan(self.entity, self.restructuring)

        # Crear factor prestacional
        PrestationalFactor.objects.create(
            regime='TERRITORIAL_GENERAL',
            year=2026,
            factor=Decimal('1.62'),
        )
        # Configurar entidad con ese régimen
        EntitySalaryConfig.objects.create(
            entity=self.entity,
            base_scale_year=2026,
            regime='TERRITORIAL_GENERAL',
        )

    def test_annual_cost_with_factor_1_62(self):
        """
        base=3.000.000, factor=1.62 → monthly_effective=4.860.000 → annual=58.320.000.
        Debe ser significativamente mayor que base×12 = 36.000.000.
        """
        pos = _make_position(self.plan, 3_000_000)
        annual = calculate_annual_cost(pos, self.entity)
        expected = Decimal('3000000') * Decimal('1.62') * 12
        self.assertAlmostEqual(float(annual), float(expected), places=1)
        # Debe ser >50% mayor que el costo sin factor
        base_annual = Decimal('3000000') * 12
        self.assertGreater(annual, base_annual * Decimal('1.5'))

    def test_effective_monthly_cost(self):
        """Costo mensual efectivo = base × factor."""
        pos = _make_position(self.plan, 3_000_000)
        effective = calculate_effective_monthly_cost(pos, self.entity)
        expected = Decimal('3000000') * Decimal('1.62')
        self.assertAlmostEqual(float(effective), float(expected), places=1)

    def test_zero_salary_returns_zero(self):
        """Cargo con salario 0 → costo efectivo 0."""
        pos = _make_position(self.plan, 0)
        self.assertEqual(calculate_effective_monthly_cost(pos, self.entity), Decimal('0'))


class ApplySalaryScaleTest(TestCase):
    """Tests para apply_salary_scale."""

    def setUp(self):
        self.entity = _make_entity()
        self.restructuring = _make_restructuring(self.entity)
        self.plan = _make_payroll_plan(self.entity, self.restructuring)

        # Sembrar escala salarial
        SalaryScale.objects.create(
            order='MUNICIPAL',
            year=2026,
            level='PROFESIONAL',
            code='219',
            grade='01',
            base_salary=Decimal('3800000'),
        )
        SalaryScale.objects.create(
            order='MUNICIPAL',
            year=2026,
            level='TECNICO',
            code='314',
            grade='01',
            base_salary=Decimal('2600000'),
        )
        SalaryScale.objects.create(
            order='MUNICIPAL',
            year=2026,
            level='ASISTENCIAL',
            code='407',
            grade='01',
            base_salary=Decimal('1800000'),
        )

    def test_apply_updates_at_least_one_position(self):
        """
        Plan con 3 posiciones (PROFESIONAL, TECNICO, ASISTENCIAL) →
        apply_salary_scale actualiza al menos una.
        """
        _make_position(self.plan, 0, 'PROFESIONAL', '219', '01')
        _make_position(self.plan, 0, 'TECNICO', '314', '01')
        _make_position(self.plan, 0, 'ASISTENCIAL', '407', '01')

        updated = apply_salary_scale(self.plan, 2026)
        self.assertGreaterEqual(updated, 1)

    def test_apply_sets_correct_salary(self):
        """La posición PROFESIONAL 219-01 debe tener 3.800.000 tras aplicar escala."""
        pos = _make_position(self.plan, 0, 'PROFESIONAL', '219', '01')
        apply_salary_scale(self.plan, 2026)
        pos.refresh_from_db()
        self.assertEqual(pos.monthly_salary, Decimal('3800000'))

    def test_apply_returns_count(self):
        """Retorna el número exacto de posiciones actualizadas."""
        _make_position(self.plan, 0, 'PROFESIONAL', '219', '01')
        _make_position(self.plan, 0, 'TECNICO', '314', '01')
        _make_position(self.plan, 0, 'ASISTENCIAL', '407', '01')

        updated = apply_salary_scale(self.plan, 2026)
        self.assertEqual(updated, 3)
