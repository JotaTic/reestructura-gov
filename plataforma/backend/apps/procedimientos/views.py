"""Views para apps.procedimientos."""
from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.mixins import RestructuringScopedMixin
from .models import Procedure, ProcedureStep
from .serializers import ProcedureSerializer, ProcedureStepSerializer
from .services import parse_procedure_docx, derive_workload_from_procedures


class ProcedureViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    """
    CRUD de procedimientos.

    Scope: entity_field='process__process_map__entity',
           restructuring_field='process__process_map__restructuring'.
    """

    queryset = Procedure.objects.select_related('process__process_map').prefetch_related('steps')
    serializer_class = ProcedureSerializer
    entity_field = 'process__process_map__entity'
    restructuring_field = 'process__process_map__restructuring'
    search_fields = ['name', 'code']
    filterset_fields = ['process', 'kind']

    def perform_create(self, serializer):
        # Override: no inyectamos entity/restructuring (se resuelven via process)
        serializer.save()

    @action(
        detail=False, methods=['post'],
        url_path='importar-docx',
        parser_classes=[MultiPartParser],
    )
    def importar_docx(self, request):
        """
        Importa un procedimiento desde DOCX.
        Form-data: file (archivo .docx), process (id del proceso).
        """
        file = request.FILES.get('file')
        process_id = request.data.get('process')
        if not file:
            return Response({'detail': 'Adjunta el archivo con el campo "file".'}, status=400)
        if not process_id:
            return Response({'detail': 'Debes indicar el campo "process" con el id del proceso.'}, status=400)
        if not str(file.name).lower().endswith('.docx'):
            return Response({'detail': 'Solo se aceptan archivos .docx.'}, status=400)
        try:
            process_id = int(process_id)
        except (ValueError, TypeError):
            return Response({'detail': 'El campo "process" debe ser un entero.'}, status=400)
        result = parse_procedure_docx(file, process_id)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='clonar-propuesto')
    def clonar_propuesto(self, request, pk=None):
        """Clone procedure as PROPOSED with all its steps."""
        original = self.get_object()
        from .models import ProcedureStep
        steps = list(ProcedureStep.objects.filter(procedure=original).order_by('order'))
        original.pk = None
        original.kind = 'PROPOSED'
        original.name = f"{original.name} (Propuesto)"
        original.save()
        for step in steps:
            step.pk = None
            step.procedure = original
            step.save()
        return Response(ProcedureSerializer(original, context={'request': request}).data, status=201)

    @action(detail=False, methods=['get'], url_path='derivar-cargas')
    def derivar_cargas(self, request):
        """
        Propone entradas de cargas desde procedimientos de un mapa.
        Query param: ?process_map=<id>
        """
        from apps.procesos.models import ProcessMap
        pm_id = request.query_params.get('process_map')
        if not pm_id:
            return Response({'detail': 'Debes proporcionar ?process_map=<id>.'}, status=400)
        try:
            pm = ProcessMap.objects.get(pk=pm_id)
        except ProcessMap.DoesNotExist:
            return Response({'detail': 'ProcessMap no encontrado.'}, status=404)
        proposals = derive_workload_from_procedures(pm)
        return Response({'count': len(proposals), 'proposals': proposals})


class ProcedureStepViewSet(viewsets.ModelViewSet):
    """CRUD de pasos de procedimiento."""

    queryset = ProcedureStep.objects.select_related('procedure')
    serializer_class = ProcedureStepSerializer
    filterset_fields = ['procedure']
    ordering_fields = ['order']
