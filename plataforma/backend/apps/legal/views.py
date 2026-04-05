from rest_framework import viewsets
from rest_framework.decorators import action

from apps.common.exports import export_response, EXPORT_RENDERERS
from apps.common.module_exports import export_legal_catalog

from .models import LegalNorm
from .serializers import LegalNormSerializer


class LegalNormViewSet(viewsets.ModelViewSet):
    queryset = LegalNorm.objects.all()
    serializer_class = LegalNormSerializer
    filterset_fields = ['kind', 'year']
    search_fields = ['reference', 'title', 'summary', 'applies_to', 'key_articles']
    ordering_fields = ['year', 'kind', 'reference']

    @action(detail=False, methods=['get'], url_path=r'export/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export(self, request, fmt=None):
        qs = self.filter_queryset(self.get_queryset())
        title, meta, sections, base, ctx = export_legal_catalog(qs)
        return export_response(fmt, title, meta, sections, base, ctx)
