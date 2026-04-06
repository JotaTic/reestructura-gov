"""Views y ViewSets para el módulo de Escala salarial (M16)."""
from rest_framework import viewsets
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin

from .models import SalaryScale, PrestationalFactor, EntitySalaryConfig
from .serializers import SalaryScaleSerializer, PrestationalFactorSerializer, EntitySalaryConfigSerializer


class SalaryScaleViewSet(viewsets.ReadOnlyModelViewSet):
    """Escala salarial de referencia (solo lectura)."""

    queryset = SalaryScale.objects.all()
    serializer_class = SalaryScaleSerializer
    filterset_fields = ['order', 'year', 'level', 'code', 'grade']
    search_fields = ['level', 'code', 'grade']
    ordering_fields = ['order', 'year', 'level', 'grade', 'base_salary']


class PrestationalFactorViewSet(viewsets.ReadOnlyModelViewSet):
    """Factores prestacionales (solo lectura)."""

    queryset = PrestationalFactor.objects.all()
    serializer_class = PrestationalFactorSerializer
    filterset_fields = ['regime', 'year']
    ordering_fields = ['regime', 'year', 'factor']


class EntitySalaryConfigViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """Configuración salarial específica de la entidad activa."""

    queryset = EntitySalaryConfig.objects.select_related('entity').all()
    serializer_class = EntitySalaryConfigSerializer
