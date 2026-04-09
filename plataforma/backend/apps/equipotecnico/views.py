from rest_framework import viewsets
from apps.common.mixins import RestructuringScopedMixin
from .models import TechnicalTeamMember
from .serializers import TechnicalTeamMemberSerializer


class TechnicalTeamMemberViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    queryset = TechnicalTeamMember.objects.select_related('restructuring').all()
    serializer_class = TechnicalTeamMemberSerializer
    filterset_fields = ['role_in_team', 'active']
    search_fields = ['name', 'position', 'department']
    entity_field = 'restructuring__entity'
    restructuring_field = 'restructuring'
