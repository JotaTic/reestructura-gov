from rest_framework import viewsets

from apps.common.mixins import EntityScopedMixin, RestructuringScopedMixin
from .models import PersonnelCommittee, CommitteeMeeting, UnionCommunication
from .serializers import (
    PersonnelCommitteeSerializer,
    CommitteeMeetingSerializer,
    UnionCommunicationSerializer,
)


class PersonnelCommitteeViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """
    Comisiones de Personal de la entidad activa.
    Requiere cabecera X-Entity-Id.
    """
    queryset = PersonnelCommittee.objects.select_related('entity').prefetch_related('meetings').all()
    serializer_class = PersonnelCommitteeSerializer
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']


class CommitteeMeetingViewSet(viewsets.ModelViewSet):
    """
    Reuniones de Comisión de Personal.
    Filterable por ?committee=<id> y ?restructuring=<id>.
    No usa scoped mixin porque se accede por committee (FK a entity) o restructuring.
    """
    queryset = CommitteeMeeting.objects.select_related(
        'committee', 'committee__entity', 'restructuring', 'minutes_document'
    ).all()
    serializer_class = CommitteeMeetingSerializer
    filterset_fields = ['committee', 'restructuring']
    search_fields = ['agenda', 'minutes_text']
    ordering_fields = ['date']

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtrar opcionalmente por committee o restructuring via query params
        committee_id = self.request.query_params.get('committee')
        restructuring_id = self.request.query_params.get('restructuring')
        if committee_id:
            qs = qs.filter(committee_id=committee_id)
        if restructuring_id:
            qs = qs.filter(restructuring_id=restructuring_id)
        return qs


class UnionCommunicationViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    """
    Comunicaciones sindicales de una reestructuración.
    Requiere cabeceras X-Entity-Id y X-Restructuring-Id.
    """
    queryset = UnionCommunication.objects.select_related('restructuring', 'document').all()
    serializer_class = UnionCommunicationSerializer
    filterset_fields = ['response_received']
    search_fields = ['union_name', 'subject']
    ordering_fields = ['sent_at', 'union_name']

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
