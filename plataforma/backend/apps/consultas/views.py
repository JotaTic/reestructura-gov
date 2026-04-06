from rest_framework import viewsets

from apps.common.mixins import RestructuringScopedMixin
from .models import OfficialConsultation
from .serializers import OfficialConsultationSerializer


class OfficialConsultationViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    """
    Consultas oficiales de una reestructuración.
    Requiere cabeceras X-Entity-Id y X-Restructuring-Id.
    """
    queryset = OfficialConsultation.objects.select_related('restructuring', 'response_document').all()
    serializer_class = OfficialConsultationSerializer
    filterset_fields = ['entity_target', 'response_result']
    search_fields = ['subject', 'reference_number']
    ordering_fields = ['sent_at', 'entity_target', 'response_result']

    entity_field = 'restructuring__entity'
    restructuring_field = 'restructuring'

    def perform_create(self, serializer):
        from apps.core.models import Restructuring
        entity_id = self.get_active_entity_id()
        rid = self.get_active_restructuring_id()
        if not Restructuring.objects.filter(id=rid, entity_id=entity_id).exists():
            from apps.common.mixins import _ContextError
            raise _ContextError(
                'La reestructuración no pertenece a la entidad activa.',
                code='restructuring_mismatch',
            )
        serializer.save(restructuring_id=rid)
