from rest_framework import serializers
from .models import FiscalYear


class FiscalYearSerializer(serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    law_617_ratio = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    law_617_compliant = serializers.BooleanField(read_only=True)
    solvency_ratio = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    sustainability_ratio = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = FiscalYear
        fields = [
            'id', 'entity', 'entity_name', 'year',
            'current_income', 'operating_expenses', 'personnel_expenses',
            'law_617_limit_pct', 'debt_service', 'total_debt',
            'law_617_ratio', 'law_617_compliant',
            'solvency_ratio', 'sustainability_ratio',
            'notes', 'created_at', 'updated_at',
        ]
