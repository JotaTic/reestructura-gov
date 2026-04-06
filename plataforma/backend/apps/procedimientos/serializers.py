"""Serializers para apps.procedimientos."""
from __future__ import annotations

from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import Procedure, ProcedureStep


class ProcedureStepSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = ProcedureStep
        fields = [
            'id', 'procedure', 'order', 'description', 'role_executor',
            'estimated_minutes', 'monthly_volume',
            'input_document', 'output_document', 'supporting_system',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProcedureSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    steps_count = serializers.SerializerMethodField()
    process_name = serializers.CharField(source='process.name', read_only=True)

    class Meta:
        model = Procedure
        fields = [
            'id', 'process', 'process_name', 'code', 'name', 'kind', 'version',
            'objective', 'scope', 'inputs_text', 'outputs_text', 'last_updated',
            'steps_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'steps_count', 'process_name']

    def get_steps_count(self, obj) -> int:
        return obj.steps.count()
