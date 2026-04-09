from decimal import Decimal
from django.db.models import Sum, Count, Q, F
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import RestructuringScopedMixin, EntityScopedMixin

from .models import Contractor, ContractorActivity
from .serializers import ContractorSerializer, ContractorActivitySerializer


class ContractorViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = Contractor.objects.select_related('entity', 'department', 'restructuring').all()
    serializer_class = ContractorSerializer
    filterset_fields = ['contract_type', 'department', 'is_active',
                        'executes_permanent_functions', 'replaces_plant_position']
    search_fields = ['full_name', 'id_number', 'contract_number', 'contract_object']
    ordering_fields = ['full_name', 'department', 'start_date', 'contract_value']

    @action(detail=False, methods=['get'], url_path='resumen')
    def summary(self, request):
        """Resumen ejecutivo de contratistas para análisis de brechas."""
        qs = self.get_queryset()
        total = qs.count()
        by_type = {}
        for ct in Contractor.ContractType.choices:
            by_type[ct[0]] = qs.filter(contract_type=ct[0]).count()

        by_department = list(
            qs.values('department__name', 'department_id')
            .annotate(
                count=Count('id'),
                total_monthly=Sum('monthly_value'),
                permanent_functions=Count('id', filter=Q(executes_permanent_functions=True)),
            )
            .order_by('-count')
        )

        permanent_count = qs.filter(executes_permanent_functions=True).count()
        replaces_count = qs.filter(replaces_plant_position=True).count()
        total_monthly = qs.aggregate(total=Sum('monthly_value'))['total'] or 0
        total_annual = float(total_monthly) * 12

        # Actividades misionales ejecutadas por contratistas
        misional_activities = ContractorActivity.objects.filter(
            contractor__in=qs,
            nature='MISIONAL',
        ).count()
        total_activities = ContractorActivity.objects.filter(contractor__in=qs).count()

        return Response({
            'total_contractors': total,
            'by_type': by_type,
            'by_department': by_department,
            'permanent_functions_count': permanent_count,
            'permanent_functions_pct': round(permanent_count / total * 100, 1) if total else 0,
            'replaces_plant_count': replaces_count,
            'total_monthly_cost': float(total_monthly),
            'total_annual_cost': total_annual,
            'misional_activities': misional_activities,
            'total_activities': total_activities,
            'misional_pct': round(misional_activities / total_activities * 100, 1) if total_activities else 0,
            'alerts': _build_alerts(qs),
        })

    @action(detail=False, methods=['get'], url_path='analisis-desnaturalizacion')
    def denaturalization_analysis(self, request):
        """Detecta contratos que podrían estar desnaturalizados."""
        qs = self.get_queryset().filter(
            Q(executes_permanent_functions=True) | Q(replaces_plant_position=True)
        ).select_related('department')

        results = []
        for c in qs:
            activities = c.activities.all()
            results.append({
                'contractor_id': c.id,
                'full_name': c.full_name,
                'contract_type': c.contract_type,
                'contract_number': c.contract_number,
                'department': c.department.name,
                'duration_months': c.duration_months,
                'executes_permanent_functions': c.executes_permanent_functions,
                'replaces_plant_position': c.replaces_plant_position,
                'misional_activities': activities.filter(nature='MISIONAL').count(),
                'total_activities': activities.count(),
                'suggested_level': c.suggested_hierarchy_level,
                'monthly_value': float(c.monthly_value),
                'risk_level': _risk_level(c),
                'recommendation': _recommendation(c),
            })

        return Response({
            'total_flagged': len(results),
            'contractors': results,
        })


class ContractorActivityViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = ContractorActivity.objects.select_related(
        'contractor', 'contractor__entity', 'contractor__restructuring'
    ).all()
    serializer_class = ContractorActivitySerializer
    filterset_fields = ['contractor', 'nature']
    search_fields = ['activity', 'process']
    entity_field = 'contractor__entity'
    restructuring_field = 'contractor__restructuring'


def _build_alerts(qs):
    alerts = []
    permanent = qs.filter(executes_permanent_functions=True)
    if permanent.exists():
        alerts.append({
            'level': 'warning',
            'message': f'{permanent.count()} contratista(s) ejecutan funciones permanentes. '
                       f'Se recomienda evaluar la creación de cargos en planta.',
        })
    long_count = sum(1 for c in qs.filter(is_active=True) if c.duration_months > 6)
    if long_count:
        alerts.append({
            'level': 'info',
            'message': f'{long_count} contrato(s) con duración > 6 meses activos.',
        })
    return alerts


def _risk_level(contractor):
    score = 0
    if contractor.executes_permanent_functions:
        score += 2
    if contractor.replaces_plant_position:
        score += 2
    if contractor.duration_months > 10:
        score += 1
    misional = contractor.activities.filter(nature='MISIONAL').count()
    if misional > 0:
        score += 1
    if score >= 4:
        return 'ALTO'
    if score >= 2:
        return 'MEDIO'
    return 'BAJO'


def _recommendation(contractor):
    if contractor.replaces_plant_position:
        level = contractor.suggested_hierarchy_level or 'PROFESIONAL'
        return f'Se recomienda crear cargo de nivel {level} en planta para cubrir estas funciones.'
    if contractor.executes_permanent_functions:
        return 'Evaluar si las funciones deben incorporarse a un cargo existente o crear uno nuevo.'
    return 'Sin observaciones de riesgo.'
