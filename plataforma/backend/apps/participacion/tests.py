"""
Tests Sprint 5 — Participación y Comisión de Personal.

Cubre:
- CRUD básico de PersonnelCommittee, CommitteeMeeting, UnionCommunication.
- Aislamiento multi-tenant.
"""
from __future__ import annotations

import datetime

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.models import Entity, Restructuring, UserEntityAccess
from apps.participacion.models import PersonnelCommittee, CommitteeMeeting, UnionCommunication

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
        name='Restr Participacion',
        reference_date=datetime.date(2026, 1, 1),
        status='BORRADOR',
    )


@override_settings(ALLOWED_HOSTS=['*'])
class PersonnelCommitteeCRUDTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_permissions', '--force')
        cls.entity = _make_entity('Alcaldía Comisión')
        cls.admin = User.objects.create_superuser('adm_part', 'ap@test.com', 'x')

    def setUp(self):
        self.client = APIClient()

    def _headers(self):
        return {'HTTP_X_ENTITY_ID': str(self.entity.id)}

    def test_create_committee(self):
        self.client.force_login(self.admin)
        payload = {
            'entity': self.entity.id,
            'name': 'Comisión de Personal',
            'members_json': [
                {'name': 'Ana García', 'role': 'Presidenta', 'since': '2025-01-01'}
            ],
        }
        r = self.client.post('/api/comision-personal/', payload, format='json', **self._headers())
        self.assertEqual(r.status_code, 201, r.json())
        self.assertEqual(r.json()['name'], 'Comisión de Personal')

    def test_list_committees(self):
        self.client.force_login(self.admin)
        PersonnelCommittee.objects.create(entity=self.entity, name='Comisión X')
        r = self.client.get('/api/comision-personal/', **self._headers())
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.json()['count'], 1)

    def test_unique_together_constraint(self):
        """No se pueden crear dos comisiones con el mismo nombre en la misma entidad."""
        PersonnelCommittee.objects.create(entity=self.entity, name='Comisión Única')
        self.client.force_login(self.admin)
        payload = {'entity': self.entity.id, 'name': 'Comisión Única'}
        r = self.client.post('/api/comision-personal/', payload, format='json', **self._headers())
        self.assertEqual(r.status_code, 400)


@override_settings(ALLOWED_HOSTS=['*'])
class CommitteeMeetingCRUDTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_permissions', '--force')
        cls.entity = _make_entity('Alcaldía Reuniones')
        cls.restr = _make_restructuring(cls.entity)
        cls.committee = PersonnelCommittee.objects.create(
            entity=cls.entity, name='Comisión Principal'
        )
        cls.admin = User.objects.create_superuser('adm_mtg', 'am@test.com', 'x')

    def setUp(self):
        self.client = APIClient()

    def test_create_meeting(self):
        self.client.force_login(self.admin)
        payload = {
            'committee': self.committee.id,
            'restructuring': self.restr.id,
            'date': '2026-03-15',
            'agenda': 'Revisión del proceso de reestructuración',
            'minutes_text': 'Se discutió el avance del proceso.',
        }
        r = self.client.post('/api/comision-reuniones/', payload, format='json')
        self.assertEqual(r.status_code, 201, r.json())
        self.assertEqual(r.json()['date'], '2026-03-15')

    def test_filter_by_restructuring(self):
        self.client.force_login(self.admin)
        CommitteeMeeting.objects.create(
            committee=self.committee,
            restructuring=self.restr,
            date=datetime.date(2026, 3, 20),
        )
        r = self.client.get(f'/api/comision-reuniones/?restructuring={self.restr.id}')
        self.assertEqual(r.status_code, 200)
        for row in r.json()['results']:
            self.assertEqual(row['restructuring'], self.restr.id)

    def test_filter_by_committee(self):
        self.client.force_login(self.admin)
        CommitteeMeeting.objects.create(
            committee=self.committee,
            date=datetime.date(2026, 4, 1),
        )
        r = self.client.get(f'/api/comision-reuniones/?committee={self.committee.id}')
        self.assertEqual(r.status_code, 200)
        for row in r.json()['results']:
            self.assertEqual(row['committee'], self.committee.id)


@override_settings(ALLOWED_HOSTS=['*'])
class UnionCommunicationCRUDTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_permissions', '--force')
        cls.entity = _make_entity('Alcaldía Sindicatos')
        cls.restr = _make_restructuring(cls.entity)
        cls.admin = User.objects.create_superuser('adm_uni', 'au@test.com', 'x')

    def setUp(self):
        self.client = APIClient()

    def _headers(self):
        return {
            'HTTP_X_ENTITY_ID': str(self.entity.id),
            'HTTP_X_RESTRUCTURING_ID': str(self.restr.id),
        }

    def test_create_union_communication(self):
        self.client.force_login(self.admin)
        payload = {
            'union_name': 'Sindicato SINTRAEM',
            'sent_at': '2026-03-01',
            'subject': 'Notificación de inicio de proceso',
            'body': 'Se les informa del inicio del proceso de reestructuración.',
        }
        r = self.client.post('/api/comunicaciones-sindicales/', payload, format='json', **self._headers())
        self.assertEqual(r.status_code, 201, r.json())
        self.assertEqual(r.json()['union_name'], 'Sindicato SINTRAEM')

    def test_list_union_communications(self):
        self.client.force_login(self.admin)
        UnionCommunication.objects.create(
            restructuring=self.restr,
            union_name='Sindicato TEST',
            sent_at=datetime.date(2026, 3, 5),
            subject='Comunicación de prueba',
        )
        r = self.client.get('/api/comunicaciones-sindicales/', **self._headers())
        self.assertEqual(r.status_code, 200)
        self.assertGreaterEqual(r.json()['count'], 1)

    def test_update_response_received(self):
        self.client.force_login(self.admin)
        obj = UnionCommunication.objects.create(
            restructuring=self.restr,
            union_name='Sindicato UPDATE',
            sent_at=datetime.date(2026, 3, 10),
            subject='A actualizar',
        )
        r = self.client.patch(
            f'/api/comunicaciones-sindicales/{obj.id}/',
            {'response_received': True, 'response_notes': 'Respuesta recibida el 15/03/2026.'},
            format='json',
            **self._headers(),
        )
        self.assertEqual(r.status_code, 200)
        obj.refresh_from_db()
        self.assertTrue(obj.response_received)


@override_settings(ALLOWED_HOSTS=['*'])
class ParticipacionTenantIsolationTests(TestCase):
    """Aislamiento multi-tenant para módulo participación."""

    @classmethod
    def setUpTestData(cls):
        cls.ent_a = _make_entity('Ent Parti A')
        cls.ent_b = _make_entity('Ent Parti B')
        cls.restr_a = _make_restructuring(cls.ent_a)
        cls.restr_b = _make_restructuring(cls.ent_b)

        # Superuser puede pasar los headers sin restricción de entidad
        cls.admin = User.objects.create_superuser('adm_parti', 'apt@test.com', 'x')

        UnionCommunication.objects.create(
            restructuring=cls.restr_a, union_name='Sindicato A',
            sent_at=datetime.date(2026, 1, 1), subject='Comunicado A',
        )
        UnionCommunication.objects.create(
            restructuring=cls.restr_b, union_name='Sindicato B',
            sent_at=datetime.date(2026, 1, 1), subject='Comunicado B',
        )

    def setUp(self):
        self.client = APIClient()

    def test_scoped_to_restructuring_a_does_not_see_b(self):
        """Al pasar X-Restructuring-Id de A, no aparecen comunicaciones de B."""
        self.client.force_login(self.admin)
        r = self.client.get(
            '/api/comunicaciones-sindicales/',
            HTTP_X_ENTITY_ID=str(self.ent_a.id),
            HTTP_X_RESTRUCTURING_ID=str(self.restr_a.id),
        )
        self.assertEqual(r.status_code, 200)
        subjects = [c['subject'] for c in r.json()['results']]
        self.assertIn('Comunicado A', subjects)
        self.assertNotIn('Comunicado B', subjects)
