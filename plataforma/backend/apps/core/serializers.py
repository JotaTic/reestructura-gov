from rest_framework import serializers
from .models import Entity, Department, TimelineActivity, Restructuring


class RestructuringSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = Restructuring
        fields = [
            'id', 'entity', 'entity_name', 'name', 'code',
            'reference_date', 'status', 'status_display', 'description',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'entity', 'name', 'code', 'parent', 'order']


class TimelineActivitySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TimelineActivity
        fields = [
            'id', 'entity', 'name', 'responsible', 'indicator',
            'start_date', 'end_date', 'status', 'status_display',
            'order', 'notes',
        ]


class EntitySerializer(serializers.ModelSerializer):
    departments_count = serializers.IntegerField(source='departments.count', read_only=True)
    nomenclature_decree = serializers.CharField(read_only=True)
    order_display = serializers.CharField(source='get_order_display', read_only=True)
    legal_nature_display = serializers.CharField(source='get_legal_nature_display', read_only=True)

    class Meta:
        model = Entity
        fields = [
            'id', 'name', 'acronym', 'order', 'order_display',
            'municipality_category', 'legal_nature', 'legal_nature_display',
            'creation_norm', 'nit', 'nomenclature_decree', 'departments_count',
            # Insumos vigentes (num. 1.1)
            'current_structure_act', 'current_payroll_act', 'current_manual_act',
            # Acuerdo inicial (num. 1.2)
            'problem_statement', 'objectives', 'approach', 'risks',
            'created_at', 'updated_at',
        ]
