"""
Tests de los validadores legales declarativos (Sprint 4 — bloque 4.3).
"""
from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import Entity, Restructuring, Department, RestructuringObjective
from apps.common.validators import RULES, Finding
from apps.common.rules import (
    rules_core, rules_diagnostico, rules_procesos,
    rules_cargas, rules_planta, rules_reten, rules_mfmp, rules_legal,
)


def _make_entity(name='Entidad Val Test'):
    return Entity.objects.create(
        name=name,
        order='MUNICIPAL',
        legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_restructuring(entity, name='Reest Val Test'):
    return Restructuring.objects.create(
        entity=entity,
        name=name,
        reference_date=date.today(),
    )


def _make_ctx(entity=None, restructuring=None):
    return {'entity': entity, 'restructuring': restructuring}


class R010ObjectivoSinIndicadorTest(TestCase):
    def test_objetivo_sin_indicador_genera_finding(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        RestructuringObjective.objects.create(
            restructuring=restr,
            kind='FORTALECIMIENTO_INSTITUCIONAL',
            indicator='',  # sin indicador
        )
        ctx = _make_ctx(entity, restr)
        findings = rules_core._check_r010(ctx)
        self.assertTrue(any(f.rule_code == 'R-010' for f in findings))

    def test_objetivo_con_indicador_no_genera_finding(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        RestructuringObjective.objects.create(
            restructuring=restr,
            kind='NIVELACION_SALARIAL',
            indicator='% de cargos nivelados / total cargos',
        )
        ctx = _make_ctx(entity, restr)
        findings = rules_core._check_r010(ctx)
        self.assertFalse(any(f.rule_code == 'R-010' for f in findings))


class R014RestructuracionSinObjetivoTest(TestCase):
    def test_sin_objetivo_genera_finding(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        ctx = _make_ctx(entity, restr)
        findings = rules_core._check_r014(ctx)
        self.assertTrue(any(f.rule_code == 'R-014' for f in findings))

    def test_con_objetivo_no_genera_finding(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        RestructuringObjective.objects.create(
            restructuring=restr,
            kind='AJUSTE_NOMENCLATURA',
        )
        ctx = _make_ctx(entity, restr)
        findings = rules_core._check_r014(ctx)
        self.assertFalse(any(f.rule_code == 'R-014' for f in findings))


class R013DiagnosticoSinDofaTest(TestCase):
    def test_diagnostico_sin_dofa_genera_finding(self):
        from apps.diagnostico.models import Diagnosis
        entity = _make_entity()
        restr = _make_restructuring(entity)
        Diagnosis.objects.create(
            entity=entity,
            restructuring=restr,
            name='Diagnóstico prueba',
            reference_date=date.today(),
        )
        ctx = _make_ctx(entity, restr)
        findings = rules_diagnostico._check_r013(ctx)
        self.assertTrue(any(f.rule_code == 'R-013' for f in findings))


class R005CargaExcedidaTest(TestCase):
    def test_cargo_con_mas_de_167_hh_genera_finding(self):
        from decimal import Decimal
        from apps.cargas.models import WorkloadMatrix, WorkloadEntry
        entity = _make_entity()
        restr = _make_restructuring(entity)
        dept = Department.objects.create(entity=entity, name='Dep A')
        matrix = WorkloadMatrix.objects.create(
            entity=entity,
            restructuring=restr,
            name='Matriz test',
            reference_date=date.today(),
        )
        # Crear entradas que superen las 167 horas
        for i in range(3):
            WorkloadEntry.objects.create(
                matrix=matrix,
                department=dept,
                process='Proceso A',
                activity=f'Actividad {i}',
                hierarchy_level='TECNICO',
                job_denomination='Técnico Adm',
                job_code='367',
                job_grade='02',
                monthly_frequency=Decimal('100'),
                t_min=Decimal('0.5'),
                t_usual=Decimal('0.6'),
                t_max=Decimal('0.7'),
            )
        ctx = _make_ctx(entity, restr)
        findings = rules_cargas._check_r005(ctx)
        self.assertTrue(any(f.rule_code == 'R-005' for f in findings))


class R011CargoSinDependenciaTest(TestCase):
    def test_r011_no_rompe_con_entries_normales(self):
        """R-011 no debe lanzar excepción, aunque en la práctica todos los entries tienen dept."""
        from decimal import Decimal
        from apps.cargas.models import WorkloadMatrix, WorkloadEntry
        entity = _make_entity()
        restr = _make_restructuring(entity)
        dept = Department.objects.create(entity=entity, name='Dep B')
        matrix = WorkloadMatrix.objects.create(
            entity=entity,
            restructuring=restr,
            name='Matriz2',
            reference_date=date.today(),
        )
        WorkloadEntry.objects.create(
            matrix=matrix,
            department=dept,
            process='Proc',
            activity='Act',
            hierarchy_level='ASISTENCIAL',
            job_denomination='Aux',
            job_code='470',
            job_grade='01',
            monthly_frequency=Decimal('10'),
            t_min=Decimal('0.5'),
            t_usual=Decimal('1'),
            t_max=Decimal('1.5'),
        )
        ctx = _make_ctx(entity, restr)
        findings = rules_cargas._check_r011(ctx)
        # No debe haber finding porque el entry tiene departamento
        self.assertFalse(any(f.rule_code == 'R-011' for f in findings))


class R003CargoPropuestoSinMatrizTest(TestCase):
    def test_cargo_propuesto_sin_actividades_genera_finding(self):
        from apps.planta.models import PayrollPlan, PayrollPosition
        entity = _make_entity()
        restr = _make_restructuring(entity)
        plan = PayrollPlan.objects.create(
            entity=entity,
            restructuring=restr,
            kind='PROPOSED',
            name='Planta propuesta',
            reference_date=date.today(),
        )
        PayrollPosition.objects.create(
            plan=plan,
            hierarchy_level='PROFESIONAL',
            denomination='Profesional Especializado',
            code='222',
            grade='05',
            monthly_salary=4000000,
        )
        ctx = _make_ctx(entity, restr)
        findings = rules_planta._check_r003(ctx)
        self.assertTrue(any(f.rule_code == 'R-003' for f in findings))


class R001R009BasicTest(TestCase):
    def test_r001_sin_diagnostico_no_rompe(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        ctx = _make_ctx(entity, restr)
        findings = rules_legal._check_r001(ctx)
        self.assertIsInstance(findings, list)

    def test_r009_sin_actos_no_rompe(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        ctx = _make_ctx(entity, restr)
        findings = rules_legal._check_r009(ctx)
        self.assertIsInstance(findings, list)


class R004R008BasicTest(TestCase):
    def test_r004_sin_planta_propuesta_no_genera_finding(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        ctx = _make_ctx(entity, restr)
        findings = rules_reten._check_r004(ctx)
        self.assertFalse(any(f.rule_code == 'R-004' for f in findings))


class R006BasicTest(TestCase):
    def test_r006_sin_mfmp_no_rompe(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        ctx = _make_ctx(entity, restr)
        findings = rules_mfmp._check_r006(ctx)
        self.assertIsInstance(findings, list)


class ValidationEndpointTest(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        self.client = APIClient()
        self.user = User.objects.create_superuser('valtest', 'v@t.com', 'pass123')
        self.client.force_authenticate(self.user)

    def test_endpoint_returns_json_with_groups(self):
        entity = _make_entity()
        restr = _make_restructuring(entity)
        resp = self.client.get(f'/api/validar/restructuring/{restr.id}/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('errors', data)
        self.assertIn('warnings', data)
        self.assertIn('info', data)
        self.assertIn('summary', data)

    def test_endpoint_404_on_invalid(self):
        resp = self.client.get('/api/validar/restructuring/99999/')
        self.assertEqual(resp.status_code, 404)
