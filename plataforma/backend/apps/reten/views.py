from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin
from apps.common.exports import export_response, EXPORT_RENDERERS
from apps.common.module_exports import export_protected_employees
from apps.core.models import Entity

from .models import ProtectedEmployee
from .serializers import ProtectedEmployeeSerializer


class ProtectedEmployeeViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    queryset = ProtectedEmployee.objects.select_related('entity').all()
    serializer_class = ProtectedEmployeeSerializer
    filterset_fields = ['protection_type', 'active']
    search_fields = ['full_name', 'id_number', 'job_denomination', 'department']
    ordering_fields = ['full_name', 'protection_type']

    @action(detail=False, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export(self, request, fmt=None):
        entity_id = self.get_active_entity_id()
        entity = Entity.objects.filter(pk=entity_id).first()
        qs = self.get_queryset().order_by('protection_type', 'full_name')
        title, meta, sections, base, ctx = export_protected_employees(entity, qs)
        return export_response(fmt, title, meta, sections, base, ctx)

    @action(detail=False, methods=['post'], url_path='sincronizar')
    def sincronizar(self, request):
        """
        POST /api/reten/sincronizar/
        Detecta automáticamente pre-pensionados, cabezas de hogar y discapacitados
        desde las hojas de vida y crea/actualiza registros en el retén social.
        No toca registros is_manual=True.
        """
        entity_id = self.get_active_entity_id()
        try:
            entity = Entity.objects.get(pk=entity_id)
        except Entity.DoesNotExist:
            return Response({'error': 'Entidad no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        from .services import sync_reten_automatico
        result = sync_reten_automatico(entity)
        return Response(result)
