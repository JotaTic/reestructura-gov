from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.mixins import RestructuringScopedMixin
from apps.common.exports import export_response, EXPORT_RENDERERS
from apps.common.module_exports import export_payroll_plan

from .models import PayrollPlan, PayrollPosition
from .serializers import PayrollPlanSerializer, PayrollPositionSerializer
from .services import compare_plans
from .import_service import import_payroll_xlsx


class PayrollPlanViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = PayrollPlan.objects.select_related('entity', 'restructuring').all()
    serializer_class = PayrollPlanSerializer
    filterset_fields = ['kind', 'structure']
    search_fields = ['name']
    ordering_fields = ['reference_date', 'name']

    @action(detail=True, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export(self, request, pk=None, fmt=None):
        plan = self.get_object()
        title, meta, sections, base, ctx = export_payroll_plan(plan)
        return export_response(fmt, title, meta, sections, base, ctx)

    @action(detail=False, methods=['get'], url_path='comparar')
    def compare(self, request):
        """
        /api/planes/comparar/?current=<id>&proposed=<id>
        Ambos planes deben pertenecer a la entidad+reestructuración activas,
        cosa que `get_queryset` ya garantiza.
        """
        qs = self.get_queryset()
        try:
            current = qs.get(pk=request.query_params.get('current'))
            proposed = qs.get(pk=request.query_params.get('proposed'))
        except PayrollPlan.DoesNotExist:
            return Response({'detail': 'Plan no encontrado en el contexto actual.'}, status=404)
        try:
            data = compare_plans(current, proposed)
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        return Response(data)

    @action(detail=True, methods=['post'], url_path='importar-xlsx', parser_classes=[MultiPartParser])
    def importar_xlsx(self, request, pk=None):
        """Importa cargos de planta desde un archivo Excel (.xlsx)."""
        plan = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Se requiere un archivo en el campo "file".'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_payroll_xlsx(file, plan)
        http_status = status.HTTP_201_CREATED if not result['errors'] else status.HTTP_207_MULTI_STATUS
        return Response(result, status=http_status)

    @action(detail=True, methods=['get'], url_path='costo-real')
    def costo_real(self, request, pk=None):
        """
        M16 — Costo real de la planta considerando factor prestacional.

        Importa el service localmente para evitar ciclos de importación.
        """
        plan = self.get_object()
        from apps.nomina.services import calculate_payroll_total
        data = calculate_payroll_total(plan)
        return Response(data)


class PayrollPositionViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = PayrollPosition.objects.select_related('plan', 'department').all()
    serializer_class = PayrollPositionSerializer
    filterset_fields = ['plan', 'hierarchy_level', 'code', 'department']
    search_fields = ['denomination', 'code']
    ordering_fields = ['hierarchy_level', 'code', 'grade', 'denomination']
    entity_field = 'plan__entity'
    restructuring_field = 'plan__restructuring'
