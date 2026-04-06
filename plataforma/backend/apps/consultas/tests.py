"""
Tests Sprint 5 — Consultas oficiales.

Cubre:
- CRUD básico vía API.
- Aislamiento multi-tenant.
- days_until_expiration correcto.
"""
from __future__ import annotations

import datetime

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.models import Entity, Restructuring, UserEntityAccess
from apps.consultas.models import OfficialConsultation, days_until_expiration

User = get_user_model()


def _make_entity(name: str) -> Entity:
    return Entity.objects.create(
        name=name,
        acronym=name[:6].upper(),
        order=Entity.Order.MUNICIPAL,
        legal_nature=Entity.LegalNature.ALCALDIA,
    )


def _make_restructuring(entity: Entity) -> Restructuring:
    return Restructuring.objects.create(
        entity=entity,
        name='Restr Consultas',
        reference_date=datetime.date(2026, 1, 1),
        status='BORRADOR',
    )


@override_settings(ALLOWED_HOSTS=['*'])
class OfficialConsultationCRUDTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_permissions', '--force')
        cls.entity = _make_entity('Alcaldía Consultas')
        cls.restr = _make_restructuring(cls.entity)
        cls.admin = User.objects.create_superuser('adm_con', 'ac@test.com', 'x')

    def setUp(self):
        self.client = APIClient()

    def _headers(self):
        return {
            'HTTP_X_ENTITY_ID': str(self.entity.id),
            'HTTP_X_RESTRUCTURING_ID': str(self.restr.id),
        }

    def test_create_consultation(self):
        self.client.force_login(self.admin)
        payload = {
            'entity_target': 'DAFP',
            'subject': 'Consulta sobre reestructuración administrativa',
            'sent_at': '2026-02-01',
            'reference_number': 'RAD-001-2026',
        }
        r = self.client.post('/api/consultas/', payload, format='json', **self._headers())
        self.assertEqual(r.status_code, 201, r.json())
        data = r.json()
        self.assertEqual(data['entity_target'], 'DAFP')
        self.assertEqual(data['response_result'], 'PENDIENTE')

    def test_list_consultations(self):
        self.client.force_login(self.admin)
        OfficialConsultation.objects.create(
            restructuring=self.restr,
            entity_target='MINHACIENDA',
            subject='Consulta MinHacienda',
            sent_at=datetime.date(2026, 2, 10),
        )
        r = self.client.get('/api/consultas/', **self._headers())
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.json()['count'], 1)

    def test_update_response(self):
        self.client.force_login(self.admin)
        obj = OfficialConsultation.objects.create(
            restructuring=self.restr,
            entity_target='DAFP',
            subject='Consulta DAFP actualizable',
            sent_at=datetime.date(2026, 2, 1),
        )
        r = self.client.patch(
            f'/api/consultas/{obj.id}/',
            {'response_at': '2026-03-01', 'response_result': 'FAVORABLE'},
            format='json',
            **self._headers(),
        )
        self.assertEqual(r.status_code, 200)
        obj.refresh_from_db()
        self.assertEqual(obj.response_result, 'FAVORABLE')

    def test_delete_consultation(self):
        self.client.force_login(self.admin)
        obj = OfficialConsultation.objects.create(
            restructuring=self.restr,
            entity_target='CNSC',
            subject='A borrar',
        )
        r = self.client.delete(f'/api/consultas/{obj.id}/', **self._headers())
        self.assertEqual(r.status_code, 204)

    def test_filter_by_entity_target(self):
        self.client.force_login(self.admin)
        OfficialConsultation.objects.create(
            restructuring=self.restr,
            entity_target='MINTRABAJO',
            subject='Consulta Mintrabajo',
        )
        r = self.client.get('/api/consultas/?entity_target=MINTRABAJO', **self._headers())
        self.assertEqual(r.status_code, 200)
        for row in r.json()['results']:
            self.assertEqual(row['entity_target'], 'MINTRABAJO')


@override_settings(ALLOWED_HOSTS=['*'])
class ConsultationTenantIsolationTests(TestCase):
    """Aislamiento: usuario de entidad A no ve consultas de entidad B."""

    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth.models import Group
        cls.ent_a = _make_entity('Entidad Consulta A')
        cls.ent_b = _make_entity('Entidad Consulta B')
        cls.restr_a = _make_restructuring(cls.ent_a)
        cls.restr_b = _make_restructuring(cls.ent_b)

        # Superuser A puede ver todas las entidades — usamos el header para restringir
        cls.admin_a = User.objects.create_superuser('adm_con_a', 'aa@test.com', 'x')

        OfficialConsultation.objects.create(
            restructuring=cls.restr_a,
            entity_target='DAFP',
            subject='Consulta A',
        )
        OfficialConsultation.objects.create(
            restructuring=cls.restr_b,
            entity_target='DAFP',
            subject='Consulta B',
        )

    def setUp(self):
        self.client = APIClient()

    def test_scoped_to_restructuring_a_does_not_see_b(self):
        """Al pasar X-Restructuring-Id de A, no aparecen consultas de B."""
        self.client.force_login(self.admin_a)
        r = self.client.get(
            '/api/consultas/',
            HTTP_X_ENTITY_ID=str(self.ent_a.id),
            HTTP_X_RESTRUCTURING_ID=str(self.restr_a.id),
        )
        self.assertEqual(r.status_code, 200)
        subjects = [c['subject'] for c in r.json()['results']]
        self.assertIn('Consulta A', subjects)
        self.assertNotIn('Consulta B', subjects)


class DaysUntilExpirationTests(TestCase):
    """Tests del cálculo de días hasta expiración."""

    def _make_consultation(self, sent_at=None, response_at=None):
        from apps.core.models import Entity, Restructuring
        ent = Entity.objects.create(
            name='Ent Exp', acronym='ENTEXP',
            order='MUNICIPAL', legal_nature='ALCALDIA',
        )
        restr = Restructuring.objects.create(
            entity=ent, name='R Exp',
            reference_date=datetime.date(2026, 1, 1),
            status='BORRADOR',
        )
        return OfficialConsultation(
            restructuring=restr,
            entity_target='DAFP',
            subject='test',
            sent_at=sent_at,
            response_at=response_at,
        )

    def test_sin_sent_at_retorna_none(self):
        c = self._make_consultation(sent_at=None)
        self.assertIsNone(days_until_expiration(c))

    def test_con_response_at_retorna_none(self):
        c = self._make_consultation(
            sent_at=datetime.date(2026, 1, 1),
            response_at=datetime.date(2026, 2, 1),
        )
        self.assertIsNone(days_until_expiration(c))

    def test_futuro_retorna_positivo(self):
        import datetime as dt
        future = dt.date.today() + dt.timedelta(days=10)
        c = self._make_consultation(sent_at=future)
        result = days_until_expiration(c)
        self.assertIsNotNone(result)
        # 30 - 0 dias = debería ser ~30 positivo; pero usamos fecha futura como sent_at
        # deadline = future + 30 días → muy positivo
        self.assertGreater(result, 0)

    def test_vencido_retorna_negativo(self):
        import datetime as dt
        old = dt.date.today() - dt.timedelta(days=45)
        c = self._make_consultation(sent_at=old)
        result = days_until_expiration(c)
        self.assertIsNotNone(result)
        self.assertLess(result, 0)
