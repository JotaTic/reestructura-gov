"""
Views y ViewSets para el módulo MFMP (M17) — Ley 819/2003.
"""
from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.exports import export_response, EXPORT_RENDERERS, docx_response
from apps.common.mixins import EntityScopedMixin

from .models import (
    MFMP,
    MFMPIncomeProjection,
    MFMPExpenseProjection,
    MFMPDebtProjection,
    MFMPScenario,
)
from .serializers import (
    MFMPSerializer,
    MFMPIncomeProjectionSerializer,
    MFMPExpenseProjectionSerializer,
    MFMPDebtProjectionSerializer,
    MFMPScenarioSerializer,
    MFMPSimulationSerializer,
)
from .services import (
    get_projection_matrix,
    calculate_law_617_by_year,
    calculate_law_358_by_year,
    simulate_plan_impact,
    import_fut_excel,
    generate_fiscal_impact_sheet,
)


class MFMPViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """MFMP de la entidad activa."""

    queryset = MFMP.objects.select_related('entity').prefetch_related(
        'incomes', 'expenses', 'debts', 'scenarios'
    )
    serializer_class = MFMPSerializer
    search_fields = ['name']
    filterset_fields = ['base_year']

    @action(detail=True, methods=['get'], url_path='matriz')
    def matriz(self, request, pk=None):
        """Devuelve la matriz de proyección completa (año × concepto)."""
        mfmp = self.get_object()
        data = get_projection_matrix(mfmp)
        return Response(data)

    @action(detail=True, methods=['get'], url_path='ley-617')
    def ley_617(self, request, pk=None):
        """Indicadores Ley 617/2000 por año."""
        mfmp = self.get_object()
        data = calculate_law_617_by_year(mfmp)
        return Response({str(k): v for k, v in data.items()})

    @action(detail=True, methods=['get'], url_path='ley-358')
    def ley_358(self, request, pk=None):
        """Indicadores Ley 358/1997 por año."""
        mfmp = self.get_object()
        data = calculate_law_358_by_year(mfmp)
        return Response({str(k): v for k, v in data.items()})

    @action(
        detail=True, methods=['post'],
        url_path='importar-fut',
        parser_classes=[MultiPartParser],
    )
    def importar_fut(self, request, pk=None):
        """Importa proyecciones desde un Excel con formato FUT."""
        mfmp = self.get_object()
        file = request.FILES.get('file')
        if file is None:
            return Response(
                {'detail': 'Debes adjuntar un archivo con el campo "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = import_fut_excel(file, mfmp)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='simular')
    def simular(self, request, pk=None):
        """
        Simula el impacto fiscal de una planta de personal.
        Query param: ?plan=<id>
        """
        mfmp = self.get_object()
        plan_id = request.query_params.get('plan')
        if not plan_id:
            return Response(
                {'detail': 'Debes proporcionar ?plan=<id> en la consulta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.planta.models import PayrollPlan
        try:
            plan = PayrollPlan.objects.get(pk=plan_id, entity_id=mfmp.entity_id)
        except PayrollPlan.DoesNotExist:
            return Response(
                {'detail': 'Plan no encontrado en la entidad del MFMP.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        result = simulate_plan_impact(mfmp, plan)
        serializer = MFMPSimulationSerializer(data=result)
        serializer.is_valid()  # siempre válido (output dict)
        return Response(result)

    @action(
        detail=True, methods=['get'],
        url_path='ficha-impacto-fiscal',
        renderer_classes=EXPORT_RENDERERS,
    )
    def ficha_impacto_fiscal(self, request, pk=None):
        """
        Genera la ficha de impacto fiscal (Ley 819 art. 7) en DOCX.
        Query param: ?plan=<id>
        """
        mfmp = self.get_object()
        plan_id = request.query_params.get('plan')
        if not plan_id:
            return Response(
                {'detail': 'Debes proporcionar ?plan=<id> en la consulta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.planta.models import PayrollPlan
        try:
            plan = PayrollPlan.objects.get(pk=plan_id, entity_id=mfmp.entity_id)
        except PayrollPlan.DoesNotExist:
            return Response(
                {'detail': 'Plan no encontrado en la entidad del MFMP.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        content = generate_fiscal_impact_sheet(mfmp, plan)
        filename_base = f'ficha_ley819_{mfmp.base_year}_{plan.pk}'
        return docx_response(content, filename_base)

    @action(
        detail=True, methods=['get'],
        url_path=r'export/(?P<fmt>xlsx|docx)',
        renderer_classes=EXPORT_RENDERERS,
    )
    def export(self, request, pk=None, fmt=None):
        """Export general del MFMP en xlsx o docx."""
        mfmp = self.get_object()
        from apps.common.module_exports import export_mfmp
        title, meta, sections, filename_base, ctx = export_mfmp(mfmp)
        return export_response(fmt or 'xlsx', title, meta, sections, filename_base, ctx)


class MFMPIncomeProjectionViewSet(viewsets.ModelViewSet):
    """CRUD de proyecciones de ingresos."""

    queryset = MFMPIncomeProjection.objects.select_related('mfmp').all()
    serializer_class = MFMPIncomeProjectionSerializer
    filterset_fields = ['mfmp', 'year', 'concept']
    ordering_fields = ['year', 'concept']


class MFMPExpenseProjectionViewSet(viewsets.ModelViewSet):
    """CRUD de proyecciones de gastos."""

    queryset = MFMPExpenseProjection.objects.select_related('mfmp').all()
    serializer_class = MFMPExpenseProjectionSerializer
    filterset_fields = ['mfmp', 'year', 'concept']
    ordering_fields = ['year', 'concept']


class MFMPDebtProjectionViewSet(viewsets.ModelViewSet):
    """CRUD de proyecciones de deuda."""

    queryset = MFMPDebtProjection.objects.select_related('mfmp').all()
    serializer_class = MFMPDebtProjectionSerializer
    filterset_fields = ['mfmp', 'year']
    ordering_fields = ['year']


class MFMPScenarioViewSet(viewsets.ModelViewSet):
    """CRUD de escenarios MFMP."""

    queryset = MFMPScenario.objects.select_related('mfmp').all()
    serializer_class = MFMPScenarioSerializer
    filterset_fields = ['mfmp', 'is_baseline']
    ordering_fields = ['name', 'is_baseline']
