from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import SuppressionAnalysis, SuppressionCost


class SuppressionCostSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    appointment_type_display = serializers.CharField(source='get_appointment_type_display', read_only=True)

    class Meta:
        model = SuppressionCost
        fields = [
            'id', 'analysis', 'employee_name', 'employee_ref',
            'position_denomination', 'position_code', 'position_grade', 'department_name',
            'appointment_type', 'appointment_type_display',
            'years_of_service', 'monthly_salary',
            'severance_cost', 'pending_benefits', 'total_suppression_cost',
            'annual_savings', 'break_even_months',
            'has_reten_social', 'reten_type', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['severance_cost', 'total_suppression_cost', 'annual_savings', 'break_even_months', 'created_at', 'updated_at']


class SuppressionAnalysisSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    costs_count = serializers.IntegerField(source='costs.count', read_only=True)

    class Meta:
        model = SuppressionAnalysis
        fields = [
            'id', 'restructuring', 'name', 'reference_date', 'notes',
            'costs_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
