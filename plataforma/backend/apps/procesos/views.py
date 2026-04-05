from rest_framework import viewsets
from rest_framework.decorators import action

from apps.common.mixins import RestructuringScopedMixin
from apps.common.exports import export_response
from apps.common.module_exports import export_process_map

from .models import ProcessMap, Process, ValueChainLink
from .serializers import ProcessMapSerializer, ProcessSerializer, ValueChainLinkSerializer


class ProcessMapViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = ProcessMap.objects.select_related('entity', 'restructuring').all()
    serializer_class = ProcessMapSerializer
    filterset_fields = ['kind']
    search_fields = ['name']
    ordering_fields = ['reference_date', 'name']

    @action(detail=True, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)')
    def export(self, request, pk=None, fmt=None):
        pm = self.get_object()
        title, meta, sections, base, ctx = export_process_map(pm)
        return export_response(fmt, title, meta, sections, base, ctx)


class ProcessViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = Process.objects.select_related('process_map').all()
    serializer_class = ProcessSerializer
    filterset_fields = ['process_map', 'type']
    search_fields = ['name', 'code']
    ordering_fields = ['order', 'type', 'name']
    entity_field = 'process_map__entity'
    restructuring_field = 'process_map__restructuring'


class ValueChainLinkViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = ValueChainLink.objects.select_related('process_map', 'related_process').all()
    serializer_class = ValueChainLinkSerializer
    filterset_fields = ['process_map', 'stage']
    ordering_fields = ['order', 'stage']
    entity_field = 'process_map__entity'
    restructuring_field = 'process_map__restructuring'
