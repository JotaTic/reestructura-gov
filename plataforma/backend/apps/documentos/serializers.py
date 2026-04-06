"""Serializers para apps.documentos."""
from __future__ import annotations

from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import Document


class DocumentSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'entity', 'entity_name', 'restructuring',
            'content_type', 'object_id',
            'title', 'kind', 'file', 'file_url', 'mime', 'size', 'notes',
            'extracted_text',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'entity_name', 'file_url', 'mime', 'size',
        ]

    def get_file_url(self, obj) -> str | None:
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
