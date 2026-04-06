"""
Serializers para el módulo MFMP (M17).
"""
from __future__ import annotations

from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import (
    MFMP,
    MFMPIncomeProjection,
    MFMPExpenseProjection,
    MFMPDebtProjection,
    MFMPScenario,
)
from .services import get_projection_matrix


class MFMPIncomeProjectionSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = MFMPIncomeProjection
        fields = [
            'id', 'mfmp', 'year', 'concept', 'amount', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MFMPExpenseProjectionSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = MFMPExpenseProjection
        fields = [
            'id', 'mfmp', 'year', 'concept', 'amount', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MFMPDebtProjectionSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = MFMPDebtProjection
        fields = [
            'id', 'mfmp', 'year', 'outstanding_debt', 'debt_service',
            'new_disbursements', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MFMPScenarioSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = MFMPScenario
        fields = [
            'id', 'mfmp', 'name', 'description', 'deltas_json',
            'is_baseline', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MFMPSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    """Serializer completo con totales calculados."""

    totals = serializers.SerializerMethodField()
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_acronym = serializers.CharField(source='entity.acronym', read_only=True)

    class Meta:
        model = MFMP
        fields = [
            'id', 'entity', 'entity_name', 'entity_acronym',
            'name', 'base_year', 'horizon_years',
            'approved_by', 'approved_at', 'notes',
            'totals',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'totals', 'entity_name', 'entity_acronym']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        return ret

    def get_totals(self, obj) -> dict:
        try:
            matrix = get_projection_matrix(obj)
            return {
                'income': matrix['totals']['income'],
                'expense': matrix['totals']['expense'],
            }
        except Exception:
            return {}


class MFMPSimulationSerializer(serializers.Serializer):
    """Serializa la salida de simulate_plan_impact (solo lectura)."""

    plan_id = serializers.IntegerField(read_only=True)
    annual_cost = serializers.FloatField(read_only=True)
    baseline = serializers.DictField(read_only=True)
    simulated = serializers.DictField(read_only=True)
    broken_years_617 = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    broken_years_358 = serializers.ListField(child=serializers.IntegerField(), read_only=True)
