"""
Tests del módulo Retén Social — Sprint 4 (bloque 4.2).
"""
from datetime import date, timedelta

from django.test import TestCase

from apps.core.models import Entity
from apps.talento.models import Employee, EmployeeExperience
from .models import ProtectedEmployee
from .services import detect_pre_pensioned, detect_head_of_household, detect_disability, sync_reten_automatico


def _make_entity(name='Entidad Reten Test'):
    return Entity.objects.create(
        name=name,
        order='MUNICIPAL',
        legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_employee(entity, birth_date, sex='F', full_name='Ana Gómez',
                   has_disability=False, is_head_of_household=False,
                   disability_percentage=None):
    kwargs = {}
    if has_disability and disability_percentage is not None:
        kwargs['disability_percentage'] = disability_percentage
    return Employee.objects.create(
        entity=entity,
        id_type='CC',
        id_number=f'8{Employee.objects.count()}88888',
        full_name=full_name,
        first_name=full_name.split()[0],
        last_name=full_name.split()[-1],
        birth_date=birth_date,
        sex=sex,
        has_disability=has_disability,
        is_head_of_household=is_head_of_household,
        **kwargs,
    )


class DetectPrePensionedTest(TestCase):
    """test_detect_pre_pensioned_marca_mujer_56_con_24_anios"""

    def test_mujer_56_24_anios_publicos(self):
        entity = _make_entity()
        birth_date = date.today() - timedelta(days=365 * 56)
        emp = _make_employee(entity, birth_date=birth_date, sex='F', full_name='Maria Ruiz')
        # 24 años de experiencia pública
        start_exp = date.today() - timedelta(days=365 * 24)
        EmployeeExperience.objects.create(
            employee=emp,
            employer='Municipio A',
            position_name='Secretaria',
            sector='PUBLICO',
            start_date=start_exp,
            is_public_sector=True,
        )

        ids = detect_pre_pensioned(entity)
        self.assertTrue(len(ids) >= 1)
        pe = ProtectedEmployee.objects.get(employee_ref=emp, protection_type='PRE_PENSIONADO')
        self.assertEqual(pe.is_manual, False)
        self.assertEqual(pe.entity, entity)

    def test_no_marca_empleado_joven(self):
        entity = _make_entity()
        birth_date = date(1990, 1, 1)
        emp = _make_employee(entity, birth_date=birth_date, sex='M', full_name='Carlos Joven')
        ids = detect_pre_pensioned(entity)
        self.assertEqual(ids, [])


class DetectHeadOfHouseholdTest(TestCase):
    """test_detect_head_of_household"""

    def test_madre_cabeza_hogar(self):
        entity = _make_entity()
        emp = _make_employee(
            entity,
            birth_date=date(1980, 5, 10),
            sex='F',
            full_name='Ana Madre',
            is_head_of_household=True,
        )
        ids = detect_head_of_household(entity)
        self.assertIn(
            ProtectedEmployee.objects.get(employee_ref=emp).id,
            ids,
        )
        pe = ProtectedEmployee.objects.get(employee_ref=emp)
        self.assertEqual(pe.protection_type, 'MADRE_CABEZA')
        self.assertEqual(pe.is_manual, False)

    def test_padre_cabeza_hogar(self):
        entity = _make_entity()
        emp = _make_employee(
            entity,
            birth_date=date(1975, 3, 20),
            sex='M',
            full_name='Pedro Padre',
            is_head_of_household=True,
        )
        ids = detect_head_of_household(entity)
        pe = ProtectedEmployee.objects.get(employee_ref=emp)
        self.assertEqual(pe.protection_type, 'PADRE_CABEZA')


class SyncNoTocaManualesTest(TestCase):
    """test_sync_no_toca_registros_manuales"""

    def test_sync_preserva_manual(self):
        entity = _make_entity()
        birth_date = date.today() - timedelta(days=365 * 56)
        emp = _make_employee(entity, birth_date=birth_date, sex='F', full_name='Rosa Manual')
        start_exp = date.today() - timedelta(days=365 * 24)
        EmployeeExperience.objects.create(
            employee=emp,
            employer='Entidad B',
            position_name='Directora',
            sector='PUBLICO',
            start_date=start_exp,
            is_public_sector=True,
        )

        # Crear registro manual ANTES del sync
        pe_manual = ProtectedEmployee.objects.create(
            entity=entity,
            employee_ref=emp,
            full_name=emp.full_name,
            id_type=emp.id_type,
            id_number=emp.id_number,
            protection_type='PRE_PENSIONADO',
            is_manual=True,
            active=True,
            evidence='Soporte manual cargado por usuario.',
        )
        original_evidence = pe_manual.evidence

        result = sync_reten_automatico(entity)

        # El registro manual debe seguir igual
        pe_manual.refresh_from_db()
        self.assertEqual(pe_manual.evidence, original_evidence)
        self.assertEqual(pe_manual.is_manual, True)
        # El sync reporta que preservó manuales
        self.assertGreaterEqual(result['manual_preserved'], 1)

    def test_sync_crea_automatico_cuando_no_existe(self):
        entity = _make_entity()
        birth_date = date.today() - timedelta(days=365 * 56)
        emp = _make_employee(entity, birth_date=birth_date, sex='F', full_name='Lucia Auto')
        EmployeeExperience.objects.create(
            employee=emp,
            employer='Municipio C',
            position_name='Auxiliar',
            sector='PUBLICO',
            start_date=date.today() - timedelta(days=365 * 24),
            is_public_sector=True,
        )

        result = sync_reten_automatico(entity)
        self.assertGreaterEqual(result['pre_pensioned'], 1)
        self.assertEqual(result['manual_preserved'], 0)
