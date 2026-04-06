"""
Sprint 6 — ViewSet del Simulador de escenarios.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from apps.common.mixins import RestructuringScopedMixin
from .models import Scenario
from .serializers import ScenarioSerializer
from .services import clone_plan_to_scenario, evaluate_scenario, compare_scenarios


class ScenarioViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    """
    CRUD de escenarios + acciones de evaluación, clonado y comparación.
    Filtrado por restructuring vía X-Restructuring-Id.
    """
    queryset = Scenario.objects.select_related('restructuring', 'payroll_plan', 'parent').all()
    serializer_class = ScenarioSerializer
    entity_field = 'restructuring__entity'
    restructuring_field = 'restructuring'

    @action(detail=True, methods=['post'], url_path='evaluar')
    def evaluar(self, request, pk=None):
        """
        POST /api/simulador/<id>/evaluar/
        Calcula y devuelve las métricas del escenario.
        """
        scenario = self.get_object()
        try:
            metrics = evaluate_scenario(scenario)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'id': scenario.id, 'name': scenario.name, 'metrics': metrics})

    @action(detail=False, methods=['post'], url_path='clonar')
    def clonar(self, request):
        """
        POST /api/simulador/clonar/
        Body: {plan_id: int, name: str}
        Clona un PayrollPlan y crea un nuevo escenario.
        """
        plan_id = request.data.get('plan_id')
        name = request.data.get('name', '').strip()
        if not plan_id or not name:
            return Response(
                {'detail': 'plan_id y name son obligatorios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.planta.models import PayrollPlan
        try:
            plan = PayrollPlan.objects.get(pk=plan_id)
        except PayrollPlan.DoesNotExist:
            return Response({'detail': 'Plan no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        # Obtener restructuring del contexto
        rid = self.get_active_restructuring_id()
        from apps.core.models import Restructuring
        try:
            restructuring = Restructuring.objects.get(pk=rid)
        except Restructuring.DoesNotExist:
            return Response({'detail': 'Reestructuración no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            scenario = clone_plan_to_scenario(plan, restructuring, name)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ScenarioSerializer(scenario, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='posiciones')
    def posiciones(self, request, pk=None):
        """
        GET /api/simulador/<id>/posiciones/
        List positions of the scenario's cloned plan.
        """
        scenario = self.get_object()
        if not scenario.payroll_plan:
            return Response([])
        from apps.planta.models import PayrollPosition
        from apps.planta.serializers import PayrollPositionSerializer
        positions = PayrollPosition.objects.filter(plan=scenario.payroll_plan)
        return Response(PayrollPositionSerializer(positions, many=True).data)

    @action(detail=False, methods=['post'], url_path='comparar')
    def comparar(self, request):
        """
        POST /api/simulador/comparar/
        Body: {scenario_ids: [int, ...]}
        Devuelve comparación lado a lado de los escenarios solicitados.
        """
        scenario_ids = request.data.get('scenario_ids', [])
        if not scenario_ids or not isinstance(scenario_ids, list):
            return Response(
                {'detail': 'scenario_ids debe ser una lista de ids.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scenarios = Scenario.objects.filter(pk__in=scenario_ids)
        if not scenarios.exists():
            return Response({'detail': 'No se encontraron escenarios.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            result = compare_scenarios(list(scenarios))
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)
