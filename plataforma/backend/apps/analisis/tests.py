"""
Tests del motor de elegibilidad y consolidador (Sprint 4 — bloques 4.1 y 4.4).
"""
from datetime import date, timedelta

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.core.models import Entity, Restructuring
from apps.talento.models import Employee, EmployeeEducation, EmployeeExperience, EmploymentRecord
from apps.planta.models import PayrollPlan, PayrollPosition
from apps.nomina.models import SalaryScale, PrestationalFactor

from .services import analyze_promotion_eligibility, bulk_analyze_level, estimate_salary_increase_cost
from .schemas import PromotionEligibility


def _make_entity(name='Test Entidad'):
    return Entity.objects.create(
        name=name,
        order='MUNICIPAL',
        legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_employee(entity, birth_date=None, sex='M', full_name='Test Empleado'):
    return Employee.objects.create(
        entity=entity,
        id_type='CC',
        id_number=f'9{Employee.objects.count()}99999',
        full_name=full_name,
        first_name='Test',
        last_name='Empleado',
        birth_date=birth_date or date(1985, 1, 1),
        sex=sex,
    )


class TestElegibleProfesionalDirecto(TestCase):
    """test_empleado_con_pregrado_y_2anios_es_elegible_profesional"""

    def test_pregrado_dos_anios_es_elegible(self):
        entity = _make_entity()
        emp = _make_employee(entity)
        EmployeeEducation.objects.create(
            employee=emp,
            level='PREGRADO',
            institution='U. Nacional',
            program='Ingeniería',
            title='Ingeniero',
        )
        start = date.today() - timedelta(days=365 * 2 + 10)
        EmployeeExperience.objects.create(
            employee=emp,
            employer='Alcaldía X',
            position_name='Analista',
            sector='PUBLICO',
            start_date=start,
            is_public_sector=True,
        )
        result = analyze_promotion_eligibility(emp, 'PROFESIONAL', '219', '01')
        self.assertEqual(result.status, 'ELEGIBLE')
        self.assertEqual(result.matched_education, 'PREGRADO')
        self.assertGreaterEqual(result.total_public_experience_years, 0.0)


class TestTecnologoEquivalencia(TestCase):
    """test_tecnologo_con_experiencia_elegible_por_equivalencia"""

    def test_tecnologo_mas_exp_es_elegible_por_equivalencia(self):
        entity = _make_entity()
        emp = _make_employee(entity)
        EmployeeEducation.objects.create(
            employee=emp,
            level='TECNOLOGO',
            institution='SENA',
            program='Tecnología en sistemas',
            title='Tecnólogo',
        )
        start = date.today() - timedelta(days=365 * 3)
        EmployeeExperience.objects.create(
            employee=emp,
            employer='Gobernación Y',
            position_name='Soporte TI',
            sector='PUBLICO',
            start_date=start,
            is_public_sector=True,
        )
        result = analyze_promotion_eligibility(emp, 'PROFESIONAL', '219', '02')
        self.assertIn(result.status, ['ELEGIBLE_POR_EQUIVALENCIA', 'ELEGIBLE'])
        self.assertIsNotNone(result.equivalence_applied)


class TestBachillerNoProfesional(TestCase):
    """test_bachiller_no_elegible_profesional"""

    def test_bachiller_no_elegible(self):
        entity = _make_entity()
        emp = _make_employee(entity)
        EmployeeEducation.objects.create(
            employee=emp,
            level='BACHILLERATO',
            institution='Colegio Z',
            program='Bachillerato',
            title='Bachiller',
        )
        result = analyze_promotion_eligibility(emp, 'PROFESIONAL', '219', '01')
        self.assertEqual(result.status, 'NO_ELEGIBLE')
        self.assertTrue(len(result.gap) > 0)


class TestBulkAnalysis(TestCase):
    """test_bulk_analyze_separa_niveles"""

    def test_bulk_separa_conteos(self):
        entity = _make_entity()
        restructuring = Restructuring.objects.create(
            entity=entity,
            name='Reest Test',
            reference_date=date.today(),
        )
        plan = PayrollPlan.objects.create(
            entity=entity,
            restructuring=restructuring,
            kind='CURRENT',
            name='Planta actual',
            reference_date=date.today(),
        )
        # Empleado 1: Técnico con pregrado → elegible para Profesional
        emp1 = _make_employee(entity, full_name='Emp Uno')
        pos1 = PayrollPosition.objects.create(
            plan=plan,
            hierarchy_level='TECNICO',
            denomination='Técnico Administrativo',
            code='367',
            grade='02',
            monthly_salary=2000000,
        )
        EmploymentRecord.objects.create(
            employee=emp1,
            position=pos1,
            entity=entity,
            appointment_type='CARRERA',
            appointment_date=date.today() - timedelta(days=365),
            is_active=True,
        )
        EmployeeEducation.objects.create(
            employee=emp1,
            level='PREGRADO',
            institution='UNAL',
            program='Derecho',
            title='Abogado',
        )
        EmployeeExperience.objects.create(
            employee=emp1,
            employer='Mun',
            position_name='Asistente',
            sector='PUBLICO',
            start_date=date.today() - timedelta(days=365 * 2),
            is_public_sector=True,
        )

        # Empleado 2: Técnico con bachillerato → NO elegible para Profesional
        emp2 = _make_employee(entity, full_name='Emp Dos')
        pos2 = PayrollPosition.objects.create(
            plan=plan,
            hierarchy_level='TECNICO',
            denomination='Técnico Adm 2',
            code='367',
            grade='03',
            monthly_salary=1900000,
        )
        EmploymentRecord.objects.create(
            employee=emp2,
            position=pos2,
            entity=entity,
            appointment_type='CARRERA',
            appointment_date=date.today() - timedelta(days=365),
            is_active=True,
        )
        EmployeeEducation.objects.create(
            employee=emp2,
            level='BACHILLERATO',
            institution='Colegio A',
            program='Bach',
            title='Bachiller',
        )

        result = bulk_analyze_level(entity, 'TECNICO', 'PROFESIONAL')
        self.assertGreaterEqual(result['total_analyzed'], 2)
        self.assertGreaterEqual(result['eligible_direct'], 1)
        self.assertGreaterEqual(result['not_eligible'], 1)
        self.assertIn('results', result)


class TestEstimarCosto(TestCase):
    """test_estimar_costo_devuelve_delta_positivo"""

    def test_estimar_costo_delta(self):
        entity = _make_entity()
        PrestationalFactor.objects.create(
            regime='TERRITORIAL_GENERAL',
            year=date.today().year,
            factor=1.62,
            detail={},
        )
        SalaryScale.objects.create(
            order='MUNICIPAL',
            year=date.today().year,
            level='PROFESIONAL',
            code='219',
            grade='01',
            base_salary=3800000,
        )
        emp = _make_employee(entity)
        restructuring = Restructuring.objects.create(
            entity=entity,
            name='R1',
            reference_date=date.today(),
        )
        plan = PayrollPlan.objects.create(
            entity=entity,
            restructuring=restructuring,
            kind='CURRENT',
            name='Base',
            reference_date=date.today(),
        )
        pos = PayrollPosition.objects.create(
            plan=plan,
            hierarchy_level='TECNICO',
            denomination='Técnico',
            code='367',
            grade='02',
            monthly_salary=2000000,
        )
        EmploymentRecord.objects.create(
            employee=emp,
            position=pos,
            entity=entity,
            appointment_type='CARRERA',
            appointment_date=date.today() - timedelta(days=365),
            is_active=True,
        )

        result = estimate_salary_increase_cost([emp], 'PROFESIONAL', '219', '01', entity)
        self.assertIn('annual_delta', result)
        self.assertIn('employees_count', result)
        self.assertEqual(result['employees_count'], 1)
        self.assertGreater(result['new_monthly_avg'], 0)


class TestBuildTechnicalStudy(TestCase):
    """test_build_technical_study_genera_docx"""

    def setUp(self):
        self.user = User.objects.create_superuser('studytest', 's@t.com', 'pass123')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_build_returns_bytes_greater_15000(self):
        from apps.analisis.consolidator import build_technical_study
        entity = _make_entity('Entidad Estudio')
        restructuring = Restructuring.objects.create(
            entity=entity,
            name='Estudio Técnico Demo',
            reference_date=date.today(),
        )
        content = build_technical_study(restructuring)
        self.assertIsInstance(content, bytes)
        self.assertGreater(len(content), 15000)

    def test_endpoint_estudio_tecnico_returns_docx(self):
        from apps.core.models import UserEntityAccess
        entity = _make_entity('Entidad Estudio2')
        restructuring = Restructuring.objects.create(
            entity=entity,
            name='Estudio2',
            reference_date=date.today(),
        )
        resp = self.client.get(
            f'/api/reestructuraciones/{restructuring.id}/estudio-tecnico/',
            HTTP_X_ENTITY_ID=str(entity.id),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('wordprocessingml', resp.get('Content-Type', ''))
        self.assertIn('Content-Disposition', resp)
