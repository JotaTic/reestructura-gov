from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin, RestructuringScopedMixin
from apps.common.exports import EXPORT_RENDERERS

from .models import WorkloadMatrix, WorkloadEntry, ManualFuncionesOverride
from .serializers import WorkloadMatrixSerializer, WorkloadEntrySerializer, ManualFuncionesOverrideSerializer
from .services import (
    consolidate_by_level,
    consolidate_by_job,
    export_to_xlsx,
    build_functions_manual,
)
from .import_service import import_workload_xlsx
from .gap_analysis import analyze_gaps


class WorkloadMatrixViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = WorkloadMatrix.objects.select_related('entity', 'restructuring').all()
    serializer_class = WorkloadMatrixSerializer
    search_fields = ['name']
    ordering_fields = ['reference_date', 'name']

    @action(detail=True, methods=['get'], url_path='consolidado-nivel')
    def consolidate_level(self, request, pk=None):
        return Response(consolidate_by_level(self.get_object()))

    @action(detail=True, methods=['get'], url_path='consolidado-cargo')
    def consolidate_job(self, request, pk=None):
        return Response(consolidate_by_job(self.get_object()))

    @action(detail=True, methods=['get'], url_path='manual-funciones')
    def functions_manual(self, request, pk=None):
        return Response(build_functions_manual(self.get_object()))

    @action(detail=True, methods=['get'], url_path='exportar-xlsx',
            renderer_classes=EXPORT_RENDERERS)
    def export_xlsx(self, request, pk=None):
        matrix = self.get_object()
        content = export_to_xlsx(matrix)
        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        filename = f'matriz_{matrix.entity.acronym or "entidad"}_{matrix.reference_date}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'], url_path='importar-xlsx', parser_classes=[MultiPartParser])
    def importar_xlsx(self, request, pk=None):
        """Importa entradas de cargas de trabajo desde un archivo Excel (.xlsx)."""
        matrix = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Se requiere un archivo en el campo "file".'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_workload_xlsx(file, matrix)
        http_status = status.HTTP_201_CREATED if not result['errors'] else status.HTTP_207_MULTI_STATUS
        return Response(result, status=http_status)

    @action(detail=True, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export(self, request, pk=None, fmt=None):
        """
        Export genérico de la matriz en XLSX o DOCX usando el helper común.
        El XLSX existente (`exportar-xlsx`) conserva el formato Anexo 5; este
        endpoint produce un reporte simplificado compatible con el resto de
        módulos para la barra de exportación común.
        """
        from apps.common.exports import export_response
        from apps.common.module_exports import export_matrix_docx
        matrix = self.get_object()
        if fmt == 'xlsx':
            # Reutiliza el Excel estilo Anexo 5 con hoja por dependencia.
            content = export_to_xlsx(matrix)
            response = HttpResponse(
                content,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            filename = f'matriz_{matrix.entity.acronym or "entidad"}_{matrix.reference_date}.xlsx'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        title, meta, sections, base, ctx = export_matrix_docx(matrix)
        return export_response(fmt, title, meta, sections, base, ctx)

    @action(detail=True, methods=['get'], url_path='brechas')
    def gap_analysis(self, request, pk=None):
        """Análisis de brechas: cargas vs planta actual vs contratistas."""
        matrix = self.get_object()
        plan_id = request.query_params.get('plan_id')
        include_contractors = request.query_params.get('include_contractors', 'true') == 'true'
        result = analyze_gaps(
            matrix.id,
            current_plan_id=int(plan_id) if plan_id else None,
            include_contractors=include_contractors,
        )
        return Response(result)

    @action(detail=True, methods=['get'], url_path=r'manual-funciones/export/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export_manual(self, request, pk=None, fmt=None):
        """M12 — Manual de funciones exportable (XLSX/DOCX) a partir de la matriz."""
        from apps.common.exports import export_response
        from apps.common.module_exports import export_functions_manual
        matrix = self.get_object()
        title, meta, sections, base, ctx = export_functions_manual(matrix)
        return export_response(fmt, title, meta, sections, base, ctx)


class WorkloadEntryViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    """
    Filas del Formulario 1. El aislamiento se aplica a través del padre
    (matrix.entity / matrix.restructuring).
    """
    queryset = WorkloadEntry.objects.select_related('matrix', 'department').all()
    serializer_class = WorkloadEntrySerializer
    filterset_fields = ['matrix', 'department', 'hierarchy_level', 'job_code']
    search_fields = ['activity', 'process', 'job_denomination']
    ordering_fields = ['department', 'process', 'created_at']
    entity_field = 'matrix__entity'
    restructuring_field = 'matrix__restructuring'

    @action(detail=False, methods=['post'], url_path='bulk')
    def bulk_upsert(self, request):
        items = request.data.get('entries', [])
        created, updated, errors = [], [], []
        for item in items:
            entry_id = item.get('id')
            serializer = self.get_serializer(
                instance=WorkloadEntry.objects.filter(pk=entry_id).first() if entry_id else None,
                data=item,
                partial=False,
            )
            if serializer.is_valid():
                obj = serializer.save()
                (updated if entry_id else created).append(obj.id)
            else:
                errors.append({'item': item, 'errors': serializer.errors})
        return Response(
            {'created': created, 'updated': updated, 'errors': errors},
            status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS,
        )


class ManualFuncionesOverrideViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """CRUD de ajustes manuales al manual de funciones."""

    queryset = ManualFuncionesOverride.objects.select_related('entity', 'restructuring')
    serializer_class = ManualFuncionesOverrideSerializer
    filterset_fields = ['restructuring', 'job_code', 'job_grade']
    search_fields = ['job_code', 'custom_purpose']
    ordering_fields = ['job_code', 'created_at']
