from rest_framework import viewsets
from rest_framework.decorators import action

from apps.common.mixins import EntityScopedMixin
from apps.common.exports import export_response
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

    @action(detail=False, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)')
    def export(self, request, fmt=None):
        entity_id = self.get_active_entity_id()
        entity = Entity.objects.filter(pk=entity_id).first()
        qs = self.get_queryset().order_by('protection_type', 'full_name')
        title, meta, sections, base, ctx = export_protected_employees(entity, qs)
        return export_response(fmt, title, meta, sections, base, ctx)
