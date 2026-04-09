from decimal import Decimal
from django.db.models import Sum, Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.mixins import RestructuringScopedMixin
from .models import SuppressionAnalysis, SuppressionCost
from .serializers import SuppressionAnalysisSerializer, SuppressionCostSerializer


class SuppressionAnalysisViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = SuppressionAnalysis.objects.select_related('restructuring').all()
    serializer_class = SuppressionAnalysisSerializer
    entity_field = 'restructuring__entity'
    restructuring_field = 'restructuring'

    @action(detail=True, methods=['get'], url_path='resumen')
    def summary(self, request, pk=None):
        analysis = self.get_object()
        costs = analysis.costs.all()
        totals = costs.aggregate(
            total_severance=Sum('severance_cost'),
            total_benefits=Sum('pending_benefits'),
            total_cost=Sum('total_suppression_cost'),
            total_savings=Sum('annual_savings'),
            count=Count('id'),
            reten_count=Count('id', filter={'has_reten_social': True}),
        )
        avg_break_even = Decimal('0')
        if totals['count'] and totals['total_cost'] and totals['total_savings']:
            monthly_savings = totals['total_savings'] / 12
            if monthly_savings > 0:
                avg_break_even = (totals['total_cost'] / monthly_savings).quantize(Decimal('0.1'))

        return Response({
            'analysis_id': analysis.id,
            'total_positions': totals['count'],
            'total_severance': float(totals['total_severance'] or 0),
            'total_pending_benefits': float(totals['total_benefits'] or 0),
            'total_suppression_cost': float(totals['total_cost'] or 0),
            'total_annual_savings': float(totals['total_savings'] or 0),
            'break_even_months': float(avg_break_even),
            'reten_social_count': totals['reten_count'],
        })


class SuppressionCostViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = SuppressionCost.objects.select_related('analysis', 'analysis__restructuring').all()
    serializer_class = SuppressionCostSerializer
    filterset_fields = ['analysis', 'appointment_type', 'has_reten_social']
    search_fields = ['employee_name', 'position_denomination', 'department_name']
    entity_field = 'analysis__restructuring__entity'
    restructuring_field = 'analysis__restructuring'
