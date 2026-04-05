from rest_framework import viewsets
from rest_framework.decorators import action

from apps.common.mixins import EntityScopedMixin
from apps.common.exports import export_response
from apps.common.module_exports import export_fiscal_years
from apps.core.models import Entity

from .models import FiscalYear
from .serializers import FiscalYearSerializer


class FiscalYearViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    queryset = FiscalYear.objects.select_related('entity').all()
    serializer_class = FiscalYearSerializer
    filterset_fields = ['year']
    ordering_fields = ['year']

    @action(detail=False, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)')
    def export(self, request, fmt=None):
        entity_id = self.get_active_entity_id()
        entity = Entity.objects.filter(pk=entity_id).first()
        qs = self.get_queryset()
        title, meta, sections, base, ctx = export_fiscal_years(entity, qs)
        return export_response(fmt, title, meta, sections, base, ctx)
