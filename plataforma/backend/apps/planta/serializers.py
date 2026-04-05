from rest_framework import serializers
from .models import PayrollPlan, PayrollPosition


class PayrollPositionSerializer(serializers.ModelSerializer):
    hierarchy_level_display = serializers.CharField(source='get_hierarchy_level_display', read_only=True)
    total_monthly = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_annual = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = PayrollPosition
        fields = [
            'id', 'plan', 'department', 'department_name',
            'hierarchy_level', 'hierarchy_level_display',
            'denomination', 'code', 'grade', 'quantity',
            'monthly_salary', 'total_monthly', 'total_annual', 'notes',
        ]


class PayrollPlanSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    structure_display = serializers.CharField(source='get_structure_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    positions_count = serializers.IntegerField(source='positions.count', read_only=True)

    class Meta:
        model = PayrollPlan
        fields = [
            'id', 'entity', 'entity_name', 'kind', 'kind_display',
            'structure', 'structure_display', 'name', 'reference_date',
            'adopted_by', 'notes', 'positions_count', 'created_at', 'updated_at',
        ]
