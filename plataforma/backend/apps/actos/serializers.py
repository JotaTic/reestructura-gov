from rest_framework import serializers
from .models import ActTemplate, ActDraft


class ActTemplateSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    topic_display = serializers.CharField(source='get_topic_display', read_only=True)

    class Meta:
        model = ActTemplate
        fields = [
            'id', 'kind', 'kind_display', 'scope', 'scope_display',
            'topic', 'topic_display', 'name', 'description', 'body',
            'is_active', 'created_at', 'updated_at',
        ]


class ActDraftSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    topic_display = serializers.CharField(source='get_topic_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = ActDraft
        fields = [
            'id', 'entity', 'entity_name', 'template', 'template_name',
            'title', 'kind', 'kind_display', 'topic', 'topic_display',
            'content', 'status', 'status_display',
            'act_number', 'issue_date', 'signed_by',
            'created_at', 'updated_at',
        ]
