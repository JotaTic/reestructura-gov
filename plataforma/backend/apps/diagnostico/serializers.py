from rest_framework import serializers
from .models import Diagnosis, SwotItem, LegalReference, EnvironmentAnalysis


class SwotItemSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    dimension_display = serializers.CharField(source='get_dimension_display', read_only=True)

    class Meta:
        model = SwotItem
        fields = [
            'id', 'diagnosis', 'type', 'type_display',
            'dimension', 'dimension_display',
            'description', 'priority', 'order',
        ]


class LegalReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalReference
        fields = [
            'id', 'diagnosis', 'norm', 'article', 'topic',
            'correlated_decision', 'order',
        ]


class EnvironmentAnalysisSerializer(serializers.ModelSerializer):
    dimension_display = serializers.CharField(source='get_dimension_display', read_only=True)
    impact_display = serializers.CharField(source='get_impact_display', read_only=True)

    class Meta:
        model = EnvironmentAnalysis
        fields = [
            'id', 'diagnosis', 'dimension', 'dimension_display',
            'description', 'impact', 'impact_display', 'order',
        ]


class DiagnosisSerializer(serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    swot_count = serializers.IntegerField(source='swot_items.count', read_only=True)
    legal_count = serializers.IntegerField(source='legal_refs.count', read_only=True)
    env_count = serializers.IntegerField(source='environments.count', read_only=True)

    class Meta:
        model = Diagnosis
        fields = [
            'id', 'entity', 'entity_name', 'name', 'reference_date',
            'mission', 'vision', 'functions_analysis', 'duplications',
            'notes', 'swot_count', 'legal_count', 'env_count',
            'created_at', 'updated_at',
        ]
