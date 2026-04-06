"""
Views del motor de elegibilidad (Sprint 4).
"""
from dataclasses import asdict

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin
from apps.core.models import Entity
from apps.talento.models import Employee

from .services import analyze_promotion_eligibility, bulk_analyze_level, estimate_salary_increase_cost


class EligibilityViewSet(EntityScopedMixin, viewsets.ViewSet):
    """
    Motor de elegibilidad — no hay modelo persistido.
    Todos los actions necesitan X-Entity-Id.
    """
    # Sin queryset propio; EntityScopedMixin se usará para get_active_entity_id()
    # override get_queryset para que no falle el mixin base
    def get_queryset(self):
        return Employee.objects.none()

    @action(detail=False, methods=['post'], url_path='analizar-individual')
    def analizar_individual(self, request):
        """
        POST /api/analisis/elegibilidad/analizar-individual/
        Body: {employee_id, target_level, target_code, target_grade}
        """
        entity_id = self.get_active_entity_id()
        data = request.data

        employee_id = data.get('employee_id')
        target_level = data.get('target_level', '')
        target_code = data.get('target_code', '')
        target_grade = data.get('target_grade', '')

        if not employee_id:
            return Response({'error': 'employee_id requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if not target_level:
            return Response({'error': 'target_level requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = Employee.objects.prefetch_related(
                'education', 'experience'
            ).get(pk=employee_id, entity_id=entity_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Empleado no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        result = analyze_promotion_eligibility(employee, target_level, target_code, target_grade)
        return Response(asdict(result))

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk(self, request):
        """
        POST /api/analisis/elegibilidad/bulk/
        Body: {from_level, to_level}
        Header: X-Entity-Id
        """
        entity_id = self.get_active_entity_id()
        data = request.data

        from_level = data.get('from_level', '')
        to_level = data.get('to_level', '')

        if not from_level or not to_level:
            return Response(
                {'error': 'from_level y to_level son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            entity = Entity.objects.get(pk=entity_id)
        except Entity.DoesNotExist:
            return Response({'error': 'Entidad no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        result = bulk_analyze_level(entity, from_level, to_level)
        return Response(result)

    @action(detail=False, methods=['post'], url_path='estimar-costo')
    def estimar_costo(self, request):
        """
        POST /api/analisis/elegibilidad/estimar-costo/
        Body: {employee_ids: [...], target_level, target_code, target_grade}
        """
        entity_id = self.get_active_entity_id()
        data = request.data

        employee_ids = data.get('employee_ids', [])
        target_level = data.get('target_level', '')
        target_code = data.get('target_code', '')
        target_grade = data.get('target_grade', '')

        if not target_level:
            return Response({'error': 'target_level requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        employees = Employee.objects.filter(
            pk__in=employee_ids, entity_id=entity_id
        ).prefetch_related('employment_records__position')

        try:
            entity = Entity.objects.get(pk=entity_id)
        except Entity.DoesNotExist:
            return Response({'error': 'Entidad no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        result = estimate_salary_increase_cost(
            list(employees), target_level, target_code, target_grade, entity
        )
        return Response(result)
