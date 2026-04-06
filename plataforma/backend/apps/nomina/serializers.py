"""Serializers para el módulo de Escala salarial (M16)."""
from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin

from .models import SalaryScale, PrestationalFactor, EntitySalaryConfig


class SalaryScaleSerializer(serializers.ModelSerializer):
    order_display = serializers.CharField(source='get_order_display', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)

    class Meta:
        model = SalaryScale
        fields = '__all__'


class PrestationalFactorSerializer(serializers.ModelSerializer):
    regime_display = serializers.CharField(source='get_regime_display', read_only=True)

    class Meta:
        model = PrestationalFactor
        fields = '__all__'


class EntitySalaryConfigSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    regime_display = serializers.CharField(source='get_regime_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = EntitySalaryConfig
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')
