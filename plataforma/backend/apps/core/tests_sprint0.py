"""
Tests del Sprint 0 — Fundaciones.

Cubre:
- Aislamiento multi-tenant por UserEntityAccess (403 entity_not_authorized).
- me/context devuelve solo entidades permitidas y el default.
- MatrixPermission niega escrituras a grupos sin celda con can_create.
- Superuser siempre pasa.
- Endpoints /api/superadmin/* exigen is_superuser.
- ChangeLog se llena al crear/editar entidades.
- reset-password genera password temporal.
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.common.models import ChangeLog
from apps.core.models import (
    Entity,
    GroupModelPermission,
    UserEntityAccess,
    Restructuring,
)


User = get_user_model()


def _make_entity(name: str, **kw) -> Entity:
    return Entity.objects.create(
        name=name,
        acronym=name[:6].upper(),
        order=Entity.Order.MUNICIPAL,
        legal_nature=Entity.LegalNature.ALCALDIA,
        **kw,
    )


@override_settings(ALLOWED_HOSTS=['*'])
class TenantIsolationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ent_a = _make_entity('Alcaldía A')
        cls.ent_b = _make_entity('Alcaldía B')
        call_command('seed_permissions')

        cls.planeacion_group, _ = Group.objects.get_or_create(name='Planeación')
        cls.consulta_group, _ = Group.objects.get_or_create(name='Consulta')
        # Re-seed permissions ahora que los grupos existen
        call_command('seed_permissions', '--force')

        cls.user_a = User.objects.create_user('ua', password='x', is_staff=True)
        cls.user_a.groups.add(cls.planeacion_group)
        UserEntityAccess.objects.create(
            user=cls.user_a, entity=cls.ent_a, is_default=True
        )
        cls.user_consulta = User.objects.create_user('uc', password='x', is_staff=True)
        cls.user_consulta.groups.add(cls.consulta_group)
        UserEntityAccess.objects.create(
            user=cls.user_consulta, entity=cls.ent_a, is_default=True
        )
        cls.admin = User.objects.create_superuser('adm', 'a@a.com', 'x')

    def setUp(self):
        self.client = APIClient()

    def test_user_only_sees_allowed_entities_in_context(self):
        self.client.force_login(self.user_a)
        r = self.client.get('/api/me/context/')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        names = [e['name'] for e in data['entities']]
        self.assertEqual(names, ['Alcaldía A'])
        self.assertEqual(data['default_entity_id'], self.ent_a.id)

    def test_superuser_sees_all_entities(self):
        self.client.force_login(self.admin)
        r = self.client.get('/api/me/context/')
        data = r.json()
        self.assertEqual(len(data['entities']), 2)
        self.assertIsNone(data['default_entity_id'])

    def test_cross_entity_access_denied(self):
        self.client.force_login(self.user_a)
        r = self.client.get('/api/reestructuraciones/', HTTP_X_ENTITY_ID=str(self.ent_b.id))
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()['code'], 'entity_not_authorized')

    def test_consulta_group_cannot_write(self):
        self.client.force_login(self.user_consulta)
        r = self.client.post(
            '/api/reestructuraciones/',
            data={
                'entity': self.ent_a.id,
                'name': 'X',
                'reference_date': '2026-01-01',
            },
            format='json',
            HTTP_X_ENTITY_ID=str(self.ent_a.id),
        )
        self.assertEqual(r.status_code, 403)

    def test_planeacion_can_create_restructuring(self):
        self.client.force_login(self.user_a)
        r = self.client.post(
            '/api/reestructuraciones/',
            data={
                'entity': self.ent_a.id,
                'name': 'Rediseño 2026',
                'reference_date': '2026-01-01',
            },
            format='json',
            HTTP_X_ENTITY_ID=str(self.ent_a.id),
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(Restructuring.objects.filter(name='Rediseño 2026').exists())


@override_settings(ALLOWED_HOSTS=['*'])
class SuperadminEndpointTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.ent = _make_entity('Alcaldía Test')
        Group.objects.get_or_create(name='Planeación')
        Group.objects.get_or_create(name='Consulta')
        call_command('seed_permissions')

        cls.admin = User.objects.create_superuser('adm2', 'a@a.com', 'x')
        cls.plain = User.objects.create_user('plain', password='x')
        cls.plain.groups.add(Group.objects.get(name='Planeación'))
        UserEntityAccess.objects.create(user=cls.plain, entity=cls.ent, is_default=True)

    def setUp(self):
        self.client = APIClient()

    def test_non_super_blocked_from_superadmin(self):
        self.client.force_login(self.plain)
        r = self.client.get('/api/superadmin/users/')
        self.assertEqual(r.status_code, 403)
        r = self.client.get('/api/superadmin/permissions/matrix/')
        self.assertEqual(r.status_code, 403)
        r = self.client.get('/api/superadmin/audit/')
        self.assertEqual(r.status_code, 403)

    def test_super_can_list_users_and_matrix(self):
        self.client.force_login(self.admin)
        r = self.client.get('/api/superadmin/users/')
        self.assertEqual(r.status_code, 200)
        r = self.client.get('/api/superadmin/permissions/matrix/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('models', r.json())
        self.assertIn('groups', r.json())

    def test_super_can_create_user_with_entities(self):
        self.client.force_login(self.admin)
        r = self.client.post(
            '/api/superadmin/users/',
            data={
                'username': 'newbie',
                'email': 'n@n.com',
                'first_name': 'New',
                'last_name': 'Bie',
                'is_active': True,
                'groups': [Group.objects.get(name='Planeación').id],
                'allowed_entity_ids': [self.ent.id],
                'default_entity_id': self.ent.id,
            },
            format='json',
        )
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertIn('temporary_password', body)
        self.assertTrue(len(body['temporary_password']) >= 10)
        self.assertEqual(
            list(UserEntityAccess.objects.filter(user__username='newbie').values_list('entity_id', flat=True)),
            [self.ent.id],
        )

    def test_reset_password_generates_temp(self):
        self.client.force_login(self.admin)
        r = self.client.post(f'/api/superadmin/users/{self.plain.id}/reset-password/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('temporary_password', r.json())

    def test_bulk_save_updates_matrix(self):
        self.client.force_login(self.admin)
        group_id = Group.objects.get(name='Consulta').id
        r = self.client.post(
            '/api/superadmin/permissions/bulk-save/',
            data={
                'app_label': 'core',
                'model': 'entity',
                'cells': [{
                    'group_id': group_id,
                    'can_create': True, 'can_read': True,
                    'can_update': True, 'can_delete': True,
                }],
            },
            format='json',
        )
        self.assertEqual(r.status_code, 204)
        row = GroupModelPermission.objects.get(group_id=group_id, app_label='core', model='entity')
        self.assertTrue(row.can_update)


class HelperUnitTests(TestCase):
    """Cubre helpers aislados del sprint (audit, mixins)."""

    @classmethod
    def setUpTestData(cls):
        cls.ent = _make_entity('HelperEnt')
        cls.super = User.objects.create_superuser('s1', 's@s.com', 'x')
        cls.plain = User.objects.create_user('p1', password='x')
        UserEntityAccess.objects.create(user=cls.plain, entity=cls.ent)

    def test_get_user_allowed_entity_ids(self):
        from apps.common.mixins import get_user_allowed_entity_ids
        self.assertIsNone(get_user_allowed_entity_ids(self.super))
        self.assertEqual(get_user_allowed_entity_ids(self.plain), {self.ent.id})
        self.assertEqual(get_user_allowed_entity_ids(None), set())

    def test_register_audit_model(self):
        from apps.common.audit import AUDIT_MODELS, register_audit_model
        register_audit_model('foo.bar')
        self.assertIn('foo.bar', AUDIT_MODELS)

    def test_audited_serializer_mixin_injects_user(self):
        from apps.common.audit import AuditedSerializerMixin

        class Base:
            def create(self, validated_data):
                return validated_data
            def update(self, instance, validated_data):
                instance.update(validated_data)
                return instance

        class Dummy(AuditedSerializerMixin, Base):
            def __init__(self, ctx):
                self.context = ctx

        class FakeReq:
            def __init__(self, user):
                self.user = user

        d = Dummy({'request': FakeReq(self.super)})
        out = d.create({})
        self.assertEqual(out['created_by'], self.super)
        out2 = d.update({}, {})
        self.assertEqual(out2['updated_by'], self.super)


@override_settings(ALLOWED_HOSTS=['*'])
class ChangeLogSignalTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        Group.objects.get_or_create(name='Planeación')
        call_command('seed_permissions')
        cls.admin = User.objects.create_superuser('adm3', 'a@a.com', 'x')

    def setUp(self):
        self.client = APIClient()
        self.client.force_login(self.admin)

    def test_creating_entity_writes_changelog(self):
        before = ChangeLog.objects.count()
        e = _make_entity('Auditada')
        self.assertGreater(ChangeLog.objects.count(), before)
        row = ChangeLog.objects.filter(
            app_label='core', model='entity', object_id=str(e.id),
        ).latest('at')
        self.assertEqual(row.action, 'CREATE')
        self.assertEqual(row.after_json.get('name'), 'Auditada')

    def test_updating_entity_writes_update_log(self):
        e = _make_entity('ParaEditar')
        e.name = 'Editada'
        e.save()
        row = ChangeLog.objects.filter(
            app_label='core', model='entity', object_id=str(e.id), action='UPDATE'
        ).latest('at')
        self.assertEqual(row.after_json.get('name'), 'Editada')
        self.assertEqual(row.before_json.get('name'), 'ParaEditar')
