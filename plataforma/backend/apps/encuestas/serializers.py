from rest_framework import serializers
from apps.common.audit import AuditedSerializerMixin
from .models import WorkloadSurvey, SurveyParticipant, SurveyActivity


class SurveyActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyActivity
        fields = [
            'id', 'participant', 'process', 'activity', 'procedure',
            'hierarchy_level', 'monthly_frequency', 't_min', 't_usual', 't_max',
            'standard_time', 'hh_month',
            'is_core_activity', 'should_be_in_plant', 'observations',
            'approved', 'consolidated', 'created_at',
        ]
        read_only_fields = ['standard_time', 'hh_month', 'created_at']


class SurveyParticipantSerializer(serializers.ModelSerializer):
    link_type_display = serializers.CharField(source='get_link_type_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    activities_count = serializers.IntegerField(source='activities.count', read_only=True)
    survey_url = serializers.CharField(read_only=True)
    is_contractor = serializers.BooleanField(read_only=True)

    class Meta:
        model = SurveyParticipant
        fields = [
            'id', 'survey', 'token', 'full_name', 'id_number', 'email', 'phone',
            'link_type', 'link_type_display', 'department', 'department_name',
            'contract_number', 'contract_object', 'contract_supervisor',
            'contract_start', 'contract_end',
            'job_denomination', 'job_code', 'job_grade',
            'submitted', 'submitted_at', 'activities_count',
            'survey_url', 'is_contractor', 'created_at',
        ]
        read_only_fields = ['token', 'submitted', 'submitted_at', 'created_at']


class WorkloadSurveySerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    matrix_name = serializers.CharField(source='matrix.name', read_only=True)
    participants_count = serializers.IntegerField(read_only=True)
    responses_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkloadSurvey
        fields = [
            'id', 'entity', 'entity_name', 'matrix', 'matrix_name',
            'name', 'description', 'status', 'deadline',
            'participants_count', 'responses_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


# ---- Serializers para el portal público (sin autenticación) ----

class PublicSurveyInfoSerializer(serializers.ModelSerializer):
    """Info mínima de la encuesta para el participante."""
    entity_name = serializers.CharField(source='survey.entity.name', read_only=True)
    survey_name = serializers.CharField(source='survey.name', read_only=True)
    survey_description = serializers.CharField(source='survey.description', read_only=True)
    survey_deadline = serializers.DateField(source='survey.deadline', read_only=True)
    survey_active = serializers.BooleanField(source='survey.is_active', read_only=True)
    departments = serializers.SerializerMethodField()

    class Meta:
        model = SurveyParticipant
        fields = [
            'full_name', 'link_type', 'department', 'department_name',
            'job_denomination', 'job_code', 'job_grade',
            'contract_number', 'contract_object',
            'submitted', 'submitted_at',
            'entity_name', 'survey_name', 'survey_description',
            'survey_deadline', 'survey_active', 'departments',
        ]

    department_name = serializers.CharField(source='department.name', read_only=True)

    def get_departments(self, obj):
        from apps.core.models import Department
        deps = Department.objects.filter(entity=obj.survey.entity).order_by('name')
        return [{'id': d.id, 'name': d.name} for d in deps]


class PublicActivitySubmitSerializer(serializers.ModelSerializer):
    """Serializer para que el participante envíe actividades desde el portal público."""

    class Meta:
        model = SurveyActivity
        fields = [
            'process', 'activity', 'procedure',
            'hierarchy_level',
            'monthly_frequency', 't_min', 't_usual', 't_max',
            'is_core_activity', 'should_be_in_plant', 'observations',
        ]

    def validate(self, data):
        t_min = data.get('t_min', 0)
        t_usual = data.get('t_usual', 0)
        t_max = data.get('t_max', 0)
        if not (t_min <= t_usual <= t_max):
            raise serializers.ValidationError('Debe cumplirse: Tiempo mínimo ≤ Tiempo usual ≤ Tiempo máximo.')
        if data.get('monthly_frequency', 0) <= 0:
            raise serializers.ValidationError('La frecuencia mensual debe ser mayor a 0.')
        return data
