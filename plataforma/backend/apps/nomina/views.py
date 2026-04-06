"""Views y ViewSets para el módulo de Escala salarial (M16)."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin

from .models import SalaryScale, PrestationalFactor, EntitySalaryConfig
from .serializers import SalaryScaleSerializer, PrestationalFactorSerializer, EntitySalaryConfigSerializer
from .import_service import import_salary_scale_xlsx


class SalaryScaleViewSet(viewsets.ModelViewSet):
    """Escala salarial de referencia."""

    queryset = SalaryScale.objects.all()
    serializer_class = SalaryScaleSerializer
    filterset_fields = ['order', 'year', 'level', 'code', 'grade']
    search_fields = ['level', 'code', 'grade']
    ordering_fields = ['order', 'year', 'level', 'grade', 'base_salary']

    @action(detail=False, methods=['post'], url_path='importar-xlsx', parser_classes=[MultiPartParser])
    def importar_xlsx(self, request):
        """Importa escala salarial desde un archivo Excel (.xlsx)."""
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Se requiere un archivo en el campo "file".'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_salary_scale_xlsx(file)
        http_status = status.HTTP_201_CREATED if not result['errors'] else status.HTTP_207_MULTI_STATUS
        return Response(result, status=http_status)


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
