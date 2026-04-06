"""
Tests del módulo Notificaciones (Sprint 6).
"""
from datetime import date

from django.contrib.auth.models import Group, User
from django.test import TestCase

from apps.core.models import Entity, Restructuring


def _make_entity(name='NotifEntity'):
    return Entity.objects.create(
        name=name,
        order='MUNICIPAL',
        legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_restructuring(entity, name='R-Notif'):
    return Restructuring.objects.create(
        entity=entity,
        name=name,
        reference_date=date.today(),
        status='BORRADOR',
    )


class NotifyServiceTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('notif_user', 'notif@test.com', 'pass123')
        self.entity = _make_entity()

    def test_notify_crea_notificacion(self):
        from apps.notificaciones.services import notify
        from apps.notificaciones.models import Notification
        notif = notify(
            user=self.user,
            kind='SYSTEM',
            message='Prueba de notificación',
            link='/dashboard',
            entity=self.entity,
        )
        self.assertIsNotNone(notif.pk)
        self.assertEqual(notif.kind, 'SYSTEM')
        self.assertEqual(notif.message, 'Prueba de notificación')
        self.assertFalse(notif.read)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)

    def test_notify_group_a_planeacion(self):
        from apps.notificaciones.services import notify_group
        from apps.notificaciones.models import Notification

        # Crear grupo y usuario en él
        group = Group.objects.create(name='Planeación')
        u1 = User.objects.create_user('plan_user1', password='pass')
        u2 = User.objects.create_user('plan_user2', password='pass')
        u1.groups.add(group)
        u2.groups.add(group)

        notifications = notify_group(
            group_name='Planeación',
            kind='TRANSITION',
            message='Reestructuración pasó a Diagnóstico completo',
            link='/reestructuraciones/1/gobierno',
        )
        self.assertEqual(len(notifications), 2)
        self.assertEqual(Notification.objects.filter(kind='TRANSITION').count(), 2)

    def test_notify_group_inexistente_devuelve_vacio(self):
        from apps.notificaciones.services import notify_group
        notifications = notify_group(
            group_name='GrupoQueNoExiste',
            kind='SYSTEM',
            message='Test',
        )
        self.assertEqual(len(notifications), 0)

    def test_mark_read_todas(self):
        from apps.notificaciones.services import notify, mark_read
        from apps.notificaciones.models import Notification

        notify(self.user, 'SYSTEM', 'N1')
        notify(self.user, 'SYSTEM', 'N2')
        notify(self.user, 'SYSTEM', 'N3')
        self.assertEqual(Notification.objects.filter(user=self.user, read=False).count(), 3)

        count = mark_read(self.user)
        self.assertEqual(count, 3)
        self.assertEqual(Notification.objects.filter(user=self.user, read=False).count(), 0)

    def test_mark_read_por_ids(self):
        from apps.notificaciones.services import notify, mark_read
        from apps.notificaciones.models import Notification

        n1 = notify(self.user, 'SYSTEM', 'N1')
        n2 = notify(self.user, 'SYSTEM', 'N2')
        notify(self.user, 'SYSTEM', 'N3')

        count = mark_read(self.user, notification_ids=[n1.pk, n2.pk])
        self.assertEqual(count, 2)
        self.assertEqual(Notification.objects.filter(user=self.user, read=False).count(), 1)


class TransitionNotificationTest(TestCase):
    """Verifica que execute_transition dispara una notificación al grupo responsable."""

    def setUp(self):
        self.entity = _make_entity('TrNotifEntity')
        self.r = _make_restructuring(self.entity, 'R-Transicion-Notif')

        # Crear grupo Planeación con un usuario
        self.group = Group.objects.create(name='Planeación')
        self.plan_user = User.objects.create_user('plan_notif_user', password='pass')
        self.plan_user.groups.add(self.group)

        self.superuser = User.objects.create_superuser('admin_notif', 'admin@test.com', 'pass')

    def _make_dofa(self):
        """Crea un diagnóstico con ítems DOFA para cumplir la precondición."""
        from apps.diagnostico.models import Diagnosis, SwotItem
        diag = Diagnosis.objects.create(
            entity=self.entity,
            restructuring=self.r,
            name='Diagnóstico Notif',
            reference_date=date.today(),
        )
        for swot_type in ['F', 'D', 'O', 'A']:
            SwotItem.objects.create(
                diagnosis=diag,
                type=swot_type,
                dimension='DIRECTIVA',
                description='Item test',
                priority=1,
                order=1,
            )

    def test_transition_dispara_notificacion(self):
        from apps.core.services.workflow import execute_transition
        from apps.notificaciones.models import Notification

        self._make_dofa()
        execute_transition(self.r, 'DIAGNOSTICO_COMPLETO', self.superuser)

        # Debe haber al menos 1 notificación para el usuario del grupo Planeación
        notifs = Notification.objects.filter(
            user=self.plan_user,
            kind='TRANSITION',
        )
        self.assertGreaterEqual(notifs.count(), 1)
        notif = notifs.first()
        self.assertIn('DIAGNOSTICO_COMPLETO'.lower() if False else 'Diagnóstico completo', notif.message)
