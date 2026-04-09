from rest_framework import viewsets
from apps.common.mixins import RestructuringScopedMixin
from .models import ImplementationPlan, ImplementationTask
from .serializers import ImplementationPlanSerializer, ImplementationTaskSerializer


class ImplementationPlanViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = ImplementationPlan.objects.select_related('restructuring').all()
    serializer_class = ImplementationPlanSerializer
    entity_field = 'restructuring__entity'
    restructuring_field = 'restructuring'


class ImplementationTaskViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = ImplementationTask.objects.select_related('plan', 'plan__restructuring').all()
    serializer_class = ImplementationTaskSerializer
    filterset_fields = ['plan', 'status', 'category', 'responsible']
    search_fields = ['name', 'responsible']
    entity_field = 'plan__restructuring__entity'
    restructuring_field = 'plan__restructuring'
