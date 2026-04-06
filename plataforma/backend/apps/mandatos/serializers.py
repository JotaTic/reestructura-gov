"""Serializers para apps.mandatos."""
from __future__ import annotations

from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import LegalMandate, MandateCompliance


class LegalMandateSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    department_name = serializers.CharField(source='assigned_to_department.name', read_only=True)

    class Meta:
        model = LegalMandate
        fields = [
            'id', 'entity', 'entity_name', 'norm', 'article', 'mandate_text',
            'kind', 'is_constitutional', 'assigned_to_department', 'department_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'entity_name', 'department_name']


class MandateComplianceSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    mandate_norm = serializers.CharField(source='mandate.norm', read_only=True)
    process_name = serializers.CharField(source='process.name', read_only=True)

    class Meta:
        model = MandateCompliance
        fields = [
            'id', 'mandate', 'mandate_norm', 'process', 'process_name',
            'coverage', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'mandate_norm', 'process_name']
