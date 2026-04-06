from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin
from .models import PersonnelCommittee, CommitteeMember, CommitteeMeeting, UnionCommunication


class PersonnelCommitteeSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    meetings_count = serializers.IntegerField(source='meetings.count', read_only=True)

    class Meta:
        model = PersonnelCommittee
        fields = [
            'id', 'entity', 'entity_name', 'name', 'members_json',
            'meetings_count',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


class CommitteeMemberSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    member_type_display = serializers.CharField(source='get_member_type_display', read_only=True)

    class Meta:
        model = CommitteeMember
        fields = [
            'id', 'committee', 'name', 'position', 'member_type', 'member_type_display',
            'start_date', 'end_date', 'active',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


class CommitteeMeetingSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    committee_name = serializers.CharField(source='committee.name', read_only=True)

    class Meta:
        model = CommitteeMeeting
        fields = [
            'id', 'committee', 'committee_name', 'restructuring',
            'date', 'agenda', 'minutes_text', 'minutes_document', 'minutes_file',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')


class UnionCommunicationSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = UnionCommunication
        fields = [
            'id', 'restructuring', 'union_name', 'sent_at', 'subject',
            'body', 'document', 'response_received', 'response_notes',
            'created_at', 'updated_at', 'created_by', 'updated_by',
        ]
        read_only_fields = ('restructuring', 'created_at', 'updated_at', 'created_by', 'updated_by')
