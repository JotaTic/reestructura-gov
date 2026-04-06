"""Views para apps.documentos."""
from __future__ import annotations

import mimetypes

from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser

from apps.common.mixins import EntityScopedMixin
from .models import Document
from .serializers import DocumentSerializer


class DocumentViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """CRUD de documentos adjuntos."""

    queryset = Document.objects.select_related('entity', 'restructuring', 'content_type')
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['kind', 'restructuring', 'content_type', 'object_id']
    search_fields = ['title', 'notes']
    ordering_fields = ['created_at', 'kind', 'title']

    def perform_create(self, serializer):
        """Override para calcular mime/size y asignar entity desde cabecera."""
        entity_id = self.get_active_entity_id()
        file = self.request.FILES.get('file')
        mime = ''
        size = 0
        if file:
            mime, _ = mimetypes.guess_type(file.name)
            mime = mime or ''
            size = file.size

        serializer.save(
            entity_id=entity_id,
            mime=mime,
            size=size,
        )
