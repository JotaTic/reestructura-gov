from rest_framework import serializers
from .models import ProtectedEmployee


class ProtectedEmployeeSerializer(serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    protection_type_display = serializers.CharField(source='get_protection_type_display', read_only=True)

    class Meta:
        model = ProtectedEmployee
        fields = [
            'id', 'entity', 'entity_name', 'full_name',
            'id_type', 'id_number', 'job_denomination', 'department',
            'protection_type', 'protection_type_display',
            'protection_start', 'protection_end',
            'evidence', 'active', 'notes',
            'created_at', 'updated_at',
        ]
