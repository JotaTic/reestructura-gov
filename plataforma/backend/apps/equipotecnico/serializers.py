from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import TechnicalTeamMember


class TechnicalTeamMemberSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_in_team_display', read_only=True)

    class Meta:
        model = TechnicalTeamMember
        fields = [
            'id', 'restructuring', 'name', 'position', 'department',
            'role_in_team', 'role_display', 'email', 'phone', 'active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
