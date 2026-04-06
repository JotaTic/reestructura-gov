"""
Tests del Dashboard ejecutivo (Sprint 6).
"""
from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import Entity, Restructuring, UserEntityAccess


def _make_entity(name='DashEntity', order='MUNICIPAL'):
    return Entity.objects.create(
        name=name,
        order=order,
        legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_restructuring(entity, name='R-Dash'):
    return Restructuring.objects.create(
        entity=entity,
        name=name,
        reference_date=date.today(),
        status='BORRADOR',
    )


class DashboardTest(TestCase):

    def setUp(self):
        self.superuser = User.objects.create_superuser('dash_admin', 'dash@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.superuser)

        self.entity = _make_entity('DashEnt1')
        _make_restructuring(self.entity, 'R1')

    def test_dashboard_returns_summary(self):
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('summary', data)
        self.assertIn('restructurings', data)
        self.assertGreaterEqual(data['summary']['total_restructurings'], 1)

    def test_dashboard_filters_by_entity(self):
        # Segunda entidad con reestructuración
        entity2 = _make_entity('DashEnt2')
        _make_restructuring(entity2, 'R2')
        _make_restructuring(entity2, 'R3')

        resp = self.client.get(f'/api/dashboard/?entity={self.entity.id}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        # Solo reestructuraciones de entity1
        entity_ids = {r['entity_id'] for r in data['restructurings']}
        self.assertIn(self.entity.id, entity_ids)
        self.assertNotIn(entity2.id, entity_ids)

    def test_dashboard_per_restructuring_con_entity(self):
        resp = self.client.get(f'/api/dashboard/?entity={self.entity.id}')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('per_restructuring', data)
        self.assertGreater(len(data['per_restructuring']), 0)
        detail = data['per_restructuring'][0]
        self.assertIn('modules_complete_pct', detail)
        self.assertIn('validation', detail)
        self.assertIn('cost_current', detail)

    def test_dashboard_sin_entidad_no_per_restructuring(self):
        resp = self.client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['per_restructuring'], [])

    def test_dashboard_requiere_autenticacion(self):
        client = APIClient()
        resp = client.get('/api/dashboard/')
        self.assertIn(resp.status_code, [401, 403])

    def test_dashboard_non_superuser_ve_solo_sus_entidades(self):
        regular_user = User.objects.create_user('dash_regular', password='pass')
        UserEntityAccess.objects.create(user=regular_user, entity=self.entity, is_default=True)

        entity3 = _make_entity('DashEnt3')
        _make_restructuring(entity3, 'R-hidden')

        client = APIClient()
        client.force_authenticate(user=regular_user)
        resp = client.get('/api/dashboard/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        entity_ids = {r['entity_id'] for r in data['restructurings']}
        self.assertNotIn(entity3.id, entity_ids)
        self.assertIn(self.entity.id, entity_ids)
