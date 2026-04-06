from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import JobNomenclature
from .serializers import JobNomenclatureSerializer
from .services import import_nomenclature_xlsx


class JobNomenclatureViewSet(viewsets.ModelViewSet):
    queryset = JobNomenclature.objects.all()
    serializer_class = JobNomenclatureSerializer
    filterset_fields = ['scope', 'level', 'code']
    search_fields = ['denomination', 'code']
    ordering_fields = ['scope', 'level', 'code']
    pagination_class = None  # catálogo — todos de una vez

    @action(detail=False, methods=['post'], url_path='importar-xlsx', parser_classes=[MultiPartParser])
    def importar_xlsx(self, request):
        """Importa nomenclatura de empleos desde un archivo Excel (.xlsx)."""
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Se requiere un archivo en el campo "file".'}, status=status.HTTP_400_BAD_REQUEST)
        result = import_nomenclature_xlsx(file)
        http_status = status.HTTP_201_CREATED if not result['errors'] else status.HTTP_207_MULTI_STATUS
        return Response(result, status=http_status)
