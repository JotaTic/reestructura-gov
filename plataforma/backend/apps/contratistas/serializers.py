from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import Contractor, ContractorActivity


class ContractorActivitySerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    nature_display = serializers.CharField(source='get_nature_display', read_only=True)

    class Meta:
        model = ContractorActivity
        fields = [
            'id', 'contractor', 'process', 'activity', 'nature', 'nature_display',
            'monthly_frequency', 'estimated_hours_month',
            'equivalent_job_code', 'equivalent_hierarchy_level',
            'observations', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ContractorSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    contract_type_display = serializers.CharField(source='get_contract_type_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    activities_count = serializers.IntegerField(source='activities.count', read_only=True)
    duration_months = serializers.FloatField(read_only=True)

    class Meta:
        model = Contractor
        fields = [
            'id', 'entity', 'restructuring',
            'full_name', 'id_type', 'id_number',
            'contract_type', 'contract_type_display',
            'contract_number', 'contract_object', 'contract_value', 'monthly_value',
            'department', 'department_name', 'supervisor',
            'start_date', 'end_date', 'is_active', 'duration_months',
            'education_level', 'profession', 'experience_years',
            'executes_permanent_functions', 'replaces_plant_position',
            'suggested_hierarchy_level',
            'activities_count', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
