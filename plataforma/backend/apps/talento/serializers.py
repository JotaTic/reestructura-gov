"""Serializers para el módulo de Hojas de vida (M15)."""
from rest_framework import serializers

from apps.common.audit import AuditedSerializerMixin

from .models import (
    Employee,
    EmployeeEducation,
    EmployeeExperience,
    EmployeeTraining,
    EmployeeEvaluation,
    EmploymentRecord,
)


class EmployeeSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    sex_display = serializers.CharField(source='get_sex_display', read_only=True)
    id_type_display = serializers.CharField(source='get_id_type_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def validate(self, attrs):
        # Validar unicidad excepto el propio objeto
        entity = attrs.get('entity') or (self.instance and self.instance.entity)
        id_type = attrs.get('id_type') or (self.instance and self.instance.id_type)
        id_number = attrs.get('id_number') or (self.instance and self.instance.id_number)
        qs = Employee.objects.filter(entity=entity, id_type=id_type, id_number=id_number)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un empleado con ese tipo y número de documento en la entidad.')
        return attrs


class EmployeeEducationSerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source='get_level_display', read_only=True)

    class Meta:
        model = EmployeeEducation
        fields = '__all__'


class EmployeeExperienceSerializer(serializers.ModelSerializer):
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)

    class Meta:
        model = EmployeeExperience
        fields = '__all__'

    def validate(self, attrs):
        end_date = attrs.get('end_date')
        start_date = attrs.get('start_date')
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'La fecha de retiro no puede ser anterior al inicio.'})
        return attrs


class EmployeeTrainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeTraining
        fields = '__all__'


class EmployeeEvaluationSerializer(serializers.ModelSerializer):
    result_display = serializers.CharField(source='get_result_display', read_only=True)

    class Meta:
        model = EmployeeEvaluation
        fields = '__all__'


class EmploymentRecordSerializer(AuditedSerializerMixin, serializers.ModelSerializer):
    appointment_type_display = serializers.CharField(source='get_appointment_type_display', read_only=True)
    administrative_status_display = serializers.CharField(source='get_administrative_status_display', read_only=True)

    class Meta:
        model = EmploymentRecord
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def validate(self, attrs):
        term = attrs.get('termination_date')
        appt = attrs.get('appointment_date')
        if term and appt and term < appt:
            raise serializers.ValidationError({'termination_date': 'La fecha de retiro no puede ser anterior a la posesión.'})
        return attrs
