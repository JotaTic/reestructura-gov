from rest_framework import serializers
from .models import JobNomenclature


class JobNomenclatureSerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)

    class Meta:
        model = JobNomenclature
        fields = ['id', 'scope', 'scope_display', 'level', 'level_display', 'code', 'denomination']
