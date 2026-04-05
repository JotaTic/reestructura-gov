from rest_framework import serializers
from .models import LegalNorm


class LegalNormSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)

    class Meta:
        model = LegalNorm
        fields = [
            'id', 'kind', 'kind_display', 'reference', 'title', 'year',
            'summary', 'key_articles', 'applies_to', 'url',
        ]
