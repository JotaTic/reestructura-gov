"""
Tests del módulo Simulador de escenarios (Sprint 6).
"""
from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase

from apps.core.models import Entity, Restructuring
from apps.planta.models import PayrollPlan, PayrollPosition


def _make_entity(name='TestEntity6', order='MUNICIPAL'):
    return Entity.objects.create(
        name=name,
        order=order,
        legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_restructuring(entity, name='R-Sim-Test'):
    return Restructuring.objects.create(
        entity=entity,
        name=name,
        reference_date=date.today(),
        status='BORRADOR',
    )


def _make_plan(entity, restructuring, kind='CURRENT'):
    plan = PayrollPlan.objects.create(
        entity=entity,
        restructuring=restructuring,
        kind=kind,
        structure='GLOBAL',
        name=f'Plan {kind}',
        reference_date=date.today(),
    )
    PayrollPosition.objects.create(
        plan=plan,
        hierarchy_level='TECNICO',
        denomination='Técnico Operativo',
        code='314',
        grade='06',
        quantity=3,
        monthly_salary='2500000.00',
    )
    return plan


class ClonePlanToScenarioTest(TestCase):

    def setUp(self):
        self.entity = _make_entity()
        self.r = _make_restructuring(self.entity)
        self.plan = _make_plan(self.entity, self.r)

    def test_clone_crea_scenario_y_plan(self):
        from apps.simulador.services import clone_plan_to_scenario
        scenario = clone_plan_to_scenario(self.plan, self.r, 'Alternativa A')
        self.assertIsNotNone(scenario.pk)
        self.assertEqual(scenario.name, 'Alternativa A')
        self.assertIsNotNone(scenario.payroll_plan)
        # El plan clonado tiene las mismas posiciones
        self.assertEqual(scenario.payroll_plan.positions.count(), 1)

    def test_clone_preserva_posiciones(self):
        from apps.simulador.services import clone_plan_to_scenario
        scenario = clone_plan_to_scenario(self.plan, self.r, 'Alternativa B')
        pos = scenario.payroll_plan.positions.first()
        self.assertEqual(pos.quantity, 3)
        self.assertEqual(str(pos.monthly_salary), '2500000.00')


class EvaluateScenarioTest(TestCase):

    def setUp(self):
        self.entity = _make_entity('EvalEntity', 'MUNICIPAL')
        self.r = _make_restructuring(self.entity, 'R-Eval')
        self.plan = _make_plan(self.entity, self.r, 'PROPOSED')

    def test_evaluate_devuelve_metricas(self):
        from apps.simulador.services import clone_plan_to_scenario, evaluate_scenario
        scenario = clone_plan_to_scenario(self.plan, self.r, 'Eval Scen')
        metrics = evaluate_scenario(scenario)
        self.assertIn('total_positions', metrics)
        self.assertIn('total_monthly_base', metrics)
        self.assertIn('total_annual', metrics)
        self.assertGreater(metrics['total_positions'], 0)

    def test_evaluate_guarda_en_cached_metrics(self):
        from apps.simulador.services import clone_plan_to_scenario, evaluate_scenario
        scenario = clone_plan_to_scenario(self.plan, self.r, 'Cache Test')
        evaluate_scenario(scenario)
        scenario.refresh_from_db()
        self.assertIn('total_positions', scenario.cached_metrics)


class CompareScenarioTest(TestCase):

    def setUp(self):
        self.entity = _make_entity('CompEntity', 'MUNICIPAL')
        self.r = _make_restructuring(self.entity, 'R-Comp')
        self.plan_a = _make_plan(self.entity, self.r, 'PROPOSED')

    def test_compare_dos_escenarios(self):
        from apps.simulador.services import clone_plan_to_scenario, evaluate_scenario, compare_scenarios
        s1 = clone_plan_to_scenario(self.plan_a, self.r, 'S1')
        s2 = clone_plan_to_scenario(self.plan_a, self.r, 'S2')
        evaluate_scenario(s1)
        evaluate_scenario(s2)
        result = compare_scenarios([s1, s2])
        self.assertIn('scenarios', result)
        self.assertIn('rankings', result)
        self.assertEqual(len(result['scenarios']), 2)
        self.assertIn('by_cost', result['rankings'])


class ScenarioModelTest(TestCase):

    def setUp(self):
        self.entity = _make_entity('ModelEntity')
        self.r = _make_restructuring(self.entity)

    def test_unique_baseline_per_restructuring(self):
        from django.db import IntegrityError
        from apps.simulador.models import Scenario
        Scenario.objects.create(
            restructuring=self.r,
            name='Base A',
            is_baseline=True,
        )
        with self.assertRaises(Exception):
            Scenario.objects.create(
                restructuring=self.r,
                name='Base B',
                is_baseline=True,
            )

    def test_unique_name_per_restructuring(self):
        from apps.simulador.models import Scenario
        Scenario.objects.create(restructuring=self.r, name='Único')
        with self.assertRaises(Exception):
            Scenario.objects.create(restructuring=self.r, name='Único')
