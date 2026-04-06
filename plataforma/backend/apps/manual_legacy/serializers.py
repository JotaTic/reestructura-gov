"""Serializers para apps.manual_legacy."""
from __future__ import annotations

from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import LegacyManual, LegacyManualRole, LegacyManualFunction


class LegacyManualFunctionSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = LegacyManualFunction
        fields = ['id', 'role', 'order', 'description', 'is_essential', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LegacyManualRoleSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    functions = LegacyManualFunctionSerializer(many=True, read_only=True)

    class Meta:
        model = LegacyManualRole
        fields = [
            'id', 'manual', 'level', 'code', 'grade', 'denomination',
            'main_purpose', 'dependencies_where_applies',
            'min_education', 'min_experience', 'order', 'functions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LegacyManualSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    roles_count = serializers.SerializerMethodField()

    class Meta:
        model = LegacyManual
        fields = [
            'id', 'entity', 'entity_name', 'name', 'act_reference',
            'issue_date', 'source_file_name', 'import_report', 'notes',
            'roles_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'import_report', 'entity_name', 'roles_count']

    def get_roles_count(self, obj) -> int:
        return obj.roles.count()
