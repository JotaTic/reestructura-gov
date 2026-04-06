from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    entity_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'kind',
            'kind_display',
            'entity',
            'entity_name',
            'restructuring',
            'message',
            'link',
            'read',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_entity_name(self, obj):
        return obj.entity.name if obj.entity_id else None
