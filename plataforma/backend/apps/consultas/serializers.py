from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import OfficialConsultation, days_until_expiration


class OfficialConsultationSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_target_display = serializers.CharField(source='get_entity_target_display', read_only=True)
    response_result_display = serializers.CharField(source='get_response_result_display', read_only=True)
    days_until_expiration = serializers.SerializerMethodField()

    class Meta:
        model = OfficialConsultation
        fields = [
            'id', 'restructuring',
            'entity_target', 'entity_target_display',
            'subject', 'sent_at', 'reference_number',
            'response_at', 'response_result', 'response_result_display',
            'response_document', 'notes',
            'days_until_expiration',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = ('restructuring', 'created_at', 'updated_at', 'created_by', 'updated_by')

    def get_days_until_expiration(self, obj):
        return days_until_expiration(obj)
