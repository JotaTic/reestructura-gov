from rest_framework import viewsets
from rest_framework.decorators import action

from apps.common.mixins import RestructuringScopedMixin
from apps.common.exports import export_response, EXPORT_RENDERERS
from apps.common.module_exports import export_diagnosis

from .models import Diagnosis, SwotItem, LegalReference, EnvironmentAnalysis
from .serializers import (
    DiagnosisSerializer,
    SwotItemSerializer,
    LegalReferenceSerializer,
    EnvironmentAnalysisSerializer,
)


class DiagnosisViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = Diagnosis.objects.select_related('entity', 'restructuring').all()
    serializer_class = DiagnosisSerializer
    search_fields = ['name']
    ordering_fields = ['reference_date', 'name']

    @action(detail=True, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export(self, request, pk=None, fmt=None):
        diagnosis = self.get_object()
        title, meta, sections, base, ctx = export_diagnosis(diagnosis)
        return export_response(fmt, title, meta, sections, base, ctx)


class SwotItemViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = SwotItem.objects.select_related('diagnosis').all()
    serializer_class = SwotItemSerializer
    filterset_fields = ['diagnosis', 'type', 'dimension']
    ordering_fields = ['order', 'type', 'dimension']
    entity_field = 'diagnosis__entity'
    restructuring_field = 'diagnosis__restructuring'


class LegalReferenceViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = LegalReference.objects.select_related('diagnosis').all()
    serializer_class = LegalReferenceSerializer
    filterset_fields = ['diagnosis']
    search_fields = ['norm', 'topic']
    ordering_fields = ['order']
    entity_field = 'diagnosis__entity'
    restructuring_field = 'diagnosis__restructuring'


class EnvironmentAnalysisViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = EnvironmentAnalysis.objects.select_related('diagnosis').all()
    serializer_class = EnvironmentAnalysisSerializer
    filterset_fields = ['diagnosis', 'dimension']
    ordering_fields = ['order', 'dimension']
    entity_field = 'diagnosis__entity'
    restructuring_field = 'diagnosis__restructuring'
