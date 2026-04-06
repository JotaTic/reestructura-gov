"""Views para apps.mandatos."""
from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin
from .models import LegalMandate, MandateCompliance
from .serializers import LegalMandateSerializer, MandateComplianceSerializer
from .services import gap_report


class LegalMandateViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """CRUD de mandatos legales."""

    queryset = LegalMandate.objects.select_related('entity', 'assigned_to_department')
    serializer_class = LegalMandateSerializer
    search_fields = ['norm', 'mandate_text', 'article']
    filterset_fields = ['kind', 'is_constitutional', 'assigned_to_department']
    ordering_fields = ['norm', 'kind']

    @action(detail=False, methods=['get'], url_path='brecha')
    def brecha(self, request):
        """Devuelve el reporte de brecha mandatos-procesos."""
        from apps.core.models import Entity
        entity_id = self.get_active_entity_id()
        try:
            entity = Entity.objects.get(pk=entity_id)
        except Entity.DoesNotExist:
            return Response({'detail': 'Entidad no encontrada.'}, status=404)
        result = gap_report(entity)
        return Response(result)


class MandateComplianceViewSet(viewsets.ModelViewSet):
    """CRUD de cumplimiento de mandatos."""

    queryset = MandateCompliance.objects.select_related('mandate', 'process')
    serializer_class = MandateComplianceSerializer
    filterset_fields = ['mandate', 'process', 'coverage']
    ordering_fields = ['mandate', 'process', 'coverage']
