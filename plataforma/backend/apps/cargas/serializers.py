from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import WorkloadMatrix, WorkloadEntry, ManualFuncionesOverride


class WorkloadEntrySerializer(serializers.ModelSerializer):
    hierarchy_level_display = serializers.CharField(source='get_hierarchy_level_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = WorkloadEntry
        fields = [
            'id', 'matrix', 'department', 'department_name',
            'process', 'activity', 'procedure',
            'hierarchy_level', 'hierarchy_level_display',
            'requirements',
            'job_denomination', 'job_code', 'job_grade',
            'main_purpose',
            'monthly_frequency', 't_min', 't_usual', 't_max',
            'standard_time', 'hh_month',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['standard_time', 'hh_month', 'created_at', 'updated_at']


class WorkloadMatrixSerializer(serializers.ModelSerializer):
    entries_count = serializers.IntegerField(source='entries.count', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = WorkloadMatrix
        fields = [
            'id', 'entity', 'entity_name', 'name', 'reference_date', 'notes',
            'entries_count', 'created_at', 'updated_at',
        ]


class BulkEntriesSerializer(serializers.Serializer):
    """Permite guardar muchas filas de una sola vez desde el grid del frontend."""
    entries = WorkloadEntrySerializer(many=True)


class ManualFuncionesOverrideSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = ManualFuncionesOverride
        fields = [
            'id', 'entity', 'entity_name', 'restructuring',
            'job_code', 'job_grade',
            'custom_purpose', 'custom_functions', 'custom_requirements',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'entity_name']
