"""
Tests Sprint 5 — Máquina de estados del Restructuring.

Cubre:
- test_borrador_a_diagnostico_completo_requiere_dofa
- test_no_aprobado_si_errors_validacion
- test_acto_expedido_exige_dafp_favorable
- test_transicion_registra_changelog
- test_non_superuser_sin_grupo_no_puede_transicionar
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.models import Entity, Restructuring, UserEntityAccess
from apps.core.services.workflow import get_available_transitions, execute_transition
from apps.core.workflow import TRANSITIONS

User = get_user_model()


def _make_entity(name: str) -> Entity:
    return Entity.objects.create(
        name=name,
        acronym=name[:6].upper(),
        order=Entity.Order.MUNICIPAL,
        legal_nature=Entity.LegalNature.ALCALDIA,
    )


def _make_restructuring(entity: Entity, status='BORRADOR') -> Restructuring:
    import datetime
    return Restructuring.objects.create(
        entity=entity,
        name='Reestructuración de prueba',
        reference_date=datetime.date(2026, 1, 1),
        status=status,
    )


@override_settings(ALLOWED_HOSTS=['*'])
class WorkflowTransitionTests(TestCase):
    """Tests unitarios de precondiciones y servicio de workflow."""

    @classmethod
    def setUpTestData(cls):
        cls.entity = _make_entity('Alcaldía Test')

    def test_borrador_a_diagnostico_completo_requiere_dofa_bloqueado(self):
        """Sin diagnóstico con DOFA, la transición debe estar bloqueada."""
        restr = _make_restructuring(self.entity, status='BORRADOR')
        transitions = get_available_transitions(restr)
        t = next((t for t in transitions if t['to_status'] == 'DIAGNOSTICO_COMPLETO'), None)
        self.assertIsNotNone(t, 'Debe existir transición BORRADOR → DIAGNOSTICO_COMPLETO')
        self.assertTrue(len(t['blocked_by']) > 0, 'Debe estar bloqueada sin DOFA')

    def test_borrador_a_diagnostico_completo_con_dofa(self):
        """Con un diagnóstico con ítems DOFA, la transición debe ser ejecutable."""
        from apps.diagnostico.models import Diagnosis, SwotItem
        restr = _make_restructuring(self.entity, status='BORRADOR')
        diag = Diagnosis.objects.create(
            entity=self.entity,
            restructuring=restr,
            name='Diagnóstico test',
            reference_date=restr.reference_date,
        )
        SwotItem.objects.create(
            diagnosis=diag,
            type=SwotItem.Type.FORTALEZA,
            dimension=SwotItem.Dimension.DIRECTIVA,
            description='Liderazgo sólido',
        )
        transitions = get_available_transitions(restr)
        t = next((t for t in transitions if t['to_status'] == 'DIAGNOSTICO_COMPLETO'), None)
        self.assertIsNotNone(t)
        self.assertEqual(t['blocked_by'], [], f'No debe estar bloqueada: {t["blocked_by"]}')

    def test_transicion_ejecuta_cambio_estado(self):
        """execute_transition cambia el status y actualiza current_status_since."""
        from apps.diagnostico.models import Diagnosis, SwotItem
        restr = _make_restructuring(self.entity, status='BORRADOR')
        diag = Diagnosis.objects.create(
            entity=self.entity,
            restructuring=restr,
            name='D2',
            reference_date=restr.reference_date,
        )
        SwotItem.objects.create(
            diagnosis=diag,
            type=SwotItem.Type.DEBILIDAD,
            dimension=SwotItem.Dimension.TECNICA,
            description='Falta tecnología',
        )
        user = User.objects.create_superuser('su_wf', 'su@test.com', 'x')
        result = execute_transition(restr, 'DIAGNOSTICO_COMPLETO', user)
        restr.refresh_from_db()
        self.assertEqual(restr.status, 'DIAGNOSTICO_COMPLETO')
        self.assertIsNotNone(restr.current_status_since)
        self.assertEqual(result['new_status'], 'DIAGNOSTICO_COMPLETO')

    def test_transicion_invalida_raise_validation_error(self):
        """Intentar transición no registrada debe lanzar ValidationError."""
        from django.core.exceptions import ValidationError
        restr = _make_restructuring(self.entity, status='BORRADOR')
        user = User.objects.create_superuser('su_inv', 'si@test.com', 'x')
        with self.assertRaises(ValidationError):
            execute_transition(restr, 'ARCHIVADO', user)

    def test_transicion_bloqueada_raise_validation_error(self):
        """Transición con precondiciones fallidas debe lanzar ValidationError."""
        from django.core.exceptions import ValidationError
        restr = _make_restructuring(self.entity, status='BORRADOR')
        user = User.objects.create_superuser('su_blk', 'sb@test.com', 'x')
        with self.assertRaises(ValidationError):
            execute_transition(restr, 'DIAGNOSTICO_COMPLETO', user)

    def test_acto_expedido_exige_dafp_favorable_bloqueado(self):
        """Sin consulta DAFP favorable, la transición APROBADO → ACTO_EXPEDIDO debe estar bloqueada."""
        restr = _make_restructuring(self.entity, status='APROBADO')
        transitions = get_available_transitions(restr)
        t = next((t for t in transitions if t['to_status'] == 'ACTO_EXPEDIDO'), None)
        self.assertIsNotNone(t, 'Debe existir transición APROBADO → ACTO_EXPEDIDO')
        self.assertTrue(len(t['blocked_by']) > 0, 'Debe estar bloqueada sin acto emitido ni DAFP')

    def test_acto_expedido_con_dafp_favorable(self):
        """Con ActDraft ISSUED y consulta DAFP FAVORABLE, la transición debe ser ejecutable."""
        import datetime
        from apps.actos.models import ActDraft
        from apps.consultas.models import OfficialConsultation

        restr = _make_restructuring(self.entity, status='APROBADO')
        # Crear acto expedido (restructuring es obligatorio en el modelo)
        ActDraft.objects.create(
            entity=self.entity,
            restructuring=restr,
            title='Decreto de reestructuración',
            kind='DECRETO',
            topic='ESTRUCTURA',
            content='...',
            status='ISSUED',
        )
        # Crear consulta DAFP favorable
        OfficialConsultation.objects.create(
            restructuring=restr,
            entity_target='DAFP',
            subject='Concepto sobre reestructuración',
            sent_at=datetime.date(2026, 1, 15),
            response_at=datetime.date(2026, 2, 15),
            response_result='FAVORABLE',
        )
        transitions = get_available_transitions(restr)
        t = next((t for t in transitions if t['to_status'] == 'ACTO_EXPEDIDO'), None)
        self.assertIsNotNone(t)
        self.assertEqual(t['blocked_by'], [], f'No debe estar bloqueada: {t["blocked_by"]}')

    def test_transicion_registra_changelog(self):
        """execute_transition debe generar entrada en ChangeLog (via signal)."""
        from apps.diagnostico.models import Diagnosis, SwotItem
        from apps.common.models import ChangeLog

        restr = _make_restructuring(self.entity, status='BORRADOR')
        diag = Diagnosis.objects.create(
            entity=self.entity,
            restructuring=restr,
            name='D_CL',
            reference_date=restr.reference_date,
        )
        SwotItem.objects.create(
            diagnosis=diag,
            type=SwotItem.Type.OPORTUNIDAD,
            dimension=SwotItem.Dimension.COMPETITIVA,
            description='Mercado amplio',
        )
        user = User.objects.create_superuser('su_cl', 'cl@test.com', 'x')
        before_count = ChangeLog.objects.filter(
            app_label='core', model='restructuring', object_id=str(restr.id)
        ).count()
        execute_transition(restr, 'DIAGNOSTICO_COMPLETO', user)
        after_count = ChangeLog.objects.filter(
            app_label='core', model='restructuring', object_id=str(restr.id)
        ).count()
        self.assertGreater(after_count, before_count, 'Debe haberse creado al menos una entrada en ChangeLog')


@override_settings(ALLOWED_HOSTS=['*'])
class WorkflowViewTests(TestCase):
    """Tests de los endpoints de workflow."""

    @classmethod
    def setUpTestData(cls):
        call_command('seed_permissions')
        cls.entity = _make_entity('Alcaldía View')
        cls.planeacion_group, _ = Group.objects.get_or_create(name='Planeación')
        cls.juridica_group, _ = Group.objects.get_or_create(name='Jurídica')
        call_command('seed_permissions', '--force')

        cls.user_plan = User.objects.create_user('u_plan', password='x')
        cls.user_plan.groups.add(cls.planeacion_group)
        UserEntityAccess.objects.create(user=cls.user_plan, entity=cls.entity, is_default=True)

        cls.user_juridica = User.objects.create_user('u_jur', password='x')
        cls.user_juridica.groups.add(cls.juridica_group)
        UserEntityAccess.objects.create(user=cls.user_juridica, entity=cls.entity, is_default=True)

        cls.admin = User.objects.create_superuser('adm_wf', 'adm@test.com', 'x')

    def setUp(self):
        self.client = APIClient()
        import datetime
        self.restr = Restructuring.objects.create(
            entity=self.entity,
            name='Restr WF',
            reference_date=datetime.date(2026, 1, 1),
            status='BORRADOR',
        )

    def tearDown(self):
        Restructuring.objects.filter(name='Restr WF').delete()

    def _headers(self):
        return {
            'HTTP_X_ENTITY_ID': str(self.entity.id),
            'HTTP_X_RESTRUCTURING_ID': str(self.restr.id),
        }

    def test_get_transiciones(self):
        """GET /api/reestructuraciones/<id>/transiciones/ retorna lista."""
        self.client.force_login(self.admin)
        r = self.client.get(
            f'/api/reestructuraciones/{self.restr.id}/transiciones/',
            **self._headers(),
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) > 0)
        first = data[0]
        self.assertIn('to_status', first)
        self.assertIn('blocked_by', first)

    def test_non_superuser_sin_grupo_no_puede_transicionar(self):
        """Usuario sin el grupo requerido no puede ejecutar la transición."""
        # user_juridica no tiene grupo 'Planeación' — no puede ejecutar BORRADOR → DIAGNOSTICO_COMPLETO
        self.client.force_login(self.user_juridica)
        r = self.client.post(
            f'/api/reestructuraciones/{self.restr.id}/transicionar/',
            {'to_status': 'DIAGNOSTICO_COMPLETO'},
            format='json',
            **self._headers(),
        )
        self.assertEqual(r.status_code, 403)

    def test_superuser_puede_transicionar_pese_a_no_tener_grupo(self):
        """Superuser puede intentar ejecutar transición (puede fallar por precondiciones, no por grupo)."""
        self.client.force_login(self.admin)
        r = self.client.post(
            f'/api/reestructuraciones/{self.restr.id}/transicionar/',
            {'to_status': 'DIAGNOSTICO_COMPLETO'},
            format='json',
            **self._headers(),
        )
        # Debe fallar por precondiciones (no hay DOFA), no por permisos de grupo
        self.assertEqual(r.status_code, 400)
        data = r.json()
        self.assertIn('blocked_by', str(data))

    def test_transicion_to_status_faltante(self):
        """POST sin to_status retorna 400."""
        self.client.force_login(self.admin)
        r = self.client.post(
            f'/api/reestructuraciones/{self.restr.id}/transicionar/',
            {},
            format='json',
            **self._headers(),
        )
        self.assertEqual(r.status_code, 400)

    def test_no_aprobado_si_errors_validacion(self):
        """
        Transición COMISION_PERSONAL_INFORMADA → APROBADO bloqueada si hay errores de validación.
        R-014: reestructuración sin objetivo es un error.
        """
        import datetime
        restr = Restructuring.objects.create(
            entity=self.entity,
            name='Restr sin obj',
            reference_date=datetime.date(2026, 1, 1),
            status='COMISION_PERSONAL_INFORMADA',
        )
        # No añadimos objetivos → R-014 debe activarse
        transitions = get_available_transitions(restr)
        t = next((t for t in transitions if t['to_status'] == 'APROBADO'), None)
        self.assertIsNotNone(t)
        self.assertTrue(len(t['blocked_by']) > 0, f'Debe estar bloqueada por R-014: {t["blocked_by"]}')
        restr.delete()
