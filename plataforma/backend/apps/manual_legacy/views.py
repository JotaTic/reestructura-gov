"""Views para apps.manual_legacy."""
from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin
from .models import LegacyManual, LegacyManualRole, LegacyManualFunction
from .serializers import LegacyManualSerializer, LegacyManualRoleSerializer, LegacyManualFunctionSerializer
from .services import parse_manual_docx, parse_manual_pdf, compare_current_vs_proposed


class LegacyManualViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """CRUD de manuales de funciones vigentes."""

    queryset = LegacyManual.objects.select_related('entity').prefetch_related('roles')
    serializer_class = LegacyManualSerializer
    search_fields = ['name', 'act_reference']
    filterset_fields = ['entity']

    @action(
        detail=True, methods=['post'],
        url_path='importar-docx',
        parser_classes=[MultiPartParser],
    )
    def importar_docx(self, request, pk=None):
        """Importa un archivo .docx y detecta cargos y funciones."""
        manual = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'detail': 'Adjunta el archivo con el campo "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not file.name.lower().endswith('.docx'):
            return Response(
                {'detail': 'Solo se aceptan archivos .docx en este sprint.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        manual.source_file_name = file.name
        manual.save(update_fields=['source_file_name'])
        result = parse_manual_docx(file, manual)
        return Response(result, status=status.HTTP_200_OK)

    @action(
        detail=True, methods=['post'],
        url_path='importar-pdf',
        parser_classes=[MultiPartParser],
    )
    def importar_pdf(self, request, pk=None):
        """Importa un archivo .pdf — parser pendiente en Sprint 3."""
        manual = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'detail': 'Adjunta el archivo con el campo "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = parse_manual_pdf(file, manual)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='comparar')
    def comparar(self, request):
        """
        Compara el manual vigente más reciente con el plan propuesto.
        Query param: ?restructuring=<id>
        """
        from apps.core.models import Entity, Restructuring
        entity_id = self.get_active_entity_id()
        restructuring_id = request.query_params.get('restructuring')
        if not restructuring_id:
            return Response(
                {'detail': 'Debes proporcionar ?restructuring=<id>.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            entity = Entity.objects.get(pk=entity_id)
            restructuring = Restructuring.objects.get(pk=restructuring_id, entity_id=entity_id)
        except (Entity.DoesNotExist, Restructuring.DoesNotExist):
            return Response(
                {'detail': 'Entidad o reestructuración no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        result = compare_current_vs_proposed(entity, restructuring)
        return Response(result)


class LegacyManualRoleViewSet(viewsets.ModelViewSet):
    """CRUD de cargos en manual vigente."""

    queryset = LegacyManualRole.objects.select_related('manual').prefetch_related('functions')
    serializer_class = LegacyManualRoleSerializer
    filterset_fields = ['manual', 'level', 'code']
    search_fields = ['denomination', 'code']
    ordering_fields = ['order', 'code', 'level']


class LegacyManualFunctionViewSet(viewsets.ModelViewSet):
    """CRUD de funciones en manual vigente."""

    queryset = LegacyManualFunction.objects.select_related('role')
    serializer_class = LegacyManualFunctionSerializer
    filterset_fields = ['role', 'is_essential']
    ordering_fields = ['order']
