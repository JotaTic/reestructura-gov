from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import Scenario


class ScenarioSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    restructuring_name = serializers.SerializerMethodField()
    payroll_plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Scenario
        fields = [
            'id',
            'restructuring',
            'restructuring_name',
            'name',
            'description',
            'parent',
            'is_baseline',
            'payroll_plan',
            'payroll_plan_name',
            'cached_metrics',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
        ]
        read_only_fields = ['cached_metrics', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def get_restructuring_name(self, obj):
        return str(obj.restructuring) if obj.restructuring_id else None

    def get_payroll_plan_name(self, obj):
        return str(obj.payroll_plan) if obj.payroll_plan_id else None
