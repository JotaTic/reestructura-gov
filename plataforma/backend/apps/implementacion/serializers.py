from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import ImplementationPlan, ImplementationTask


class ImplementationTaskSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ImplementationTask
        fields = [
            'id', 'plan', 'name', 'category', 'category_display',
            'responsible', 'start_date', 'end_date',
            'status', 'status_display', 'depends_on', 'notes', 'order',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ImplementationPlanSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    tasks_count = serializers.IntegerField(source='tasks.count', read_only=True)

    class Meta:
        model = ImplementationPlan
        fields = [
            'id', 'restructuring', 'name', 'description',
            'start_date', 'end_date', 'tasks_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
