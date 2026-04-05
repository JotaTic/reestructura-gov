from rest_framework import viewsets
from .models import JobNomenclature
from .serializers import JobNomenclatureSerializer


class JobNomenclatureViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JobNomenclature.objects.all()
    serializer_class = JobNomenclatureSerializer
    filterset_fields = ['scope', 'level', 'code']
    search_fields = ['denomination', 'code']
    ordering_fields = ['scope', 'level', 'code']
    pagination_class = None  # catálogo — todos de una vez
