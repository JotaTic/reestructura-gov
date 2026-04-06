"""Views y ViewSets para el módulo de Hojas de vida (M15)."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.exports import export_response, EXPORT_RENDERERS
from apps.common.mixins import EntityScopedMixin
from apps.common.module_exports import export_employee_cv

from .models import (
    Employee,
    EmployeeEducation,
    EmployeeExperience,
    EmployeeTraining,
    EmployeeEvaluation,
    EmploymentRecord,
)
from .serializers import (
    EmployeeSerializer,
    EmployeeEducationSerializer,
    EmployeeExperienceSerializer,
    EmployeeTrainingSerializer,
    EmployeeEvaluationSerializer,
    EmploymentRecordSerializer,
)
from .services import import_sigep_excel, calculate_tenure, calculate_retirement_eligibility


class EmployeeViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """Hojas de vida de empleados, filtradas por entidad activa."""

    queryset = Employee.objects.select_related('entity').all()
    serializer_class = EmployeeSerializer
    search_fields = ['full_name', 'id_number', 'first_name', 'last_name']
    filterset_fields = ['id_type', 'sex', 'has_disability', 'is_head_of_household']
    ordering_fields = ['full_name', 'last_name', 'id_number', 'birth_date']

    @action(detail=True, methods=['get'], url_path='hoja-de-vida')
    def hoja_de_vida(self, request, pk=None):
        """Devuelve el empleado completo con todas sus sub-tablas."""
        emp = self.get_object()
        tenure = calculate_tenure(emp)
        retirement = calculate_retirement_eligibility(emp)
        data = {
            'employee': EmployeeSerializer(emp, context={'request': request}).data,
            'education': EmployeeEducationSerializer(emp.education.all(), many=True).data,
            'experience': EmployeeExperienceSerializer(emp.experience.all(), many=True).data,
            'training': EmployeeTrainingSerializer(emp.training.all(), many=True).data,
            'evaluations': EmployeeEvaluationSerializer(emp.evaluations.all(), many=True).data,
            'employment_records': EmploymentRecordSerializer(
                emp.employment_records.select_related('entity', 'position').all(),
                many=True,
            ).data,
            'tenure': tenure,
            'retirement_eligibility': retirement,
        }
        return Response(data)

    @action(
        detail=False, methods=['post'],
        url_path='importar-sigep',
        parser_classes=[MultiPartParser],
    )
    def importar_sigep(self, request):
        """Importa empleados desde un archivo Excel de SIGEP (.xlsx)."""
        file = request.FILES.get('file')
        if file is None:
            return Response({'detail': 'Debes adjuntar un archivo con el campo "file".'}, status=400)
        if not file.name.lower().endswith('.xlsx'):
            return Response({'detail': 'Solo se aceptan archivos .xlsx.'}, status=400)

        entity_id = self.get_active_entity_id()
        from apps.core.models import Entity
        try:
            entity = Entity.objects.get(pk=entity_id)
        except Entity.DoesNotExist:
            return Response({'detail': 'Entidad no encontrada.'}, status=404)

        result = import_sigep_excel(file, entity)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload-cv', parser_classes=[MultiPartParser])
    def upload_cv(self, request, pk=None):
        """Carga la hoja de vida (CV) del empleado como archivo adjunto."""
        employee = self.get_object()
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'Archivo requerido.'}, status=400)
        employee.cv_file = file
        employee.save(update_fields=['cv_file'])
        return Response({'detail': 'Hoja de vida cargada.', 'url': employee.cv_file.url})

    @action(
        detail=True, methods=['get'],
        url_path=r'export-cv/(?P<fmt>docx)',
        renderer_classes=EXPORT_RENDERERS,
    )
    def export_cv(self, request, pk=None, fmt=None):
        """Exporta la hoja de vida del empleado como Word."""
        emp = self.get_object()
        title, meta, sections, base, ctx = export_employee_cv(emp)
        return export_response(fmt or 'docx', title, meta, sections, base, ctx)


class EmployeeEducationViewSet(viewsets.ModelViewSet):
    queryset = EmployeeEducation.objects.select_related('employee').all()
    serializer_class = EmployeeEducationSerializer
    filterset_fields = ['employee', 'level']
    ordering_fields = ['level', 'graduation_date']


class EmployeeExperienceViewSet(viewsets.ModelViewSet):
    queryset = EmployeeExperience.objects.select_related('employee').all()
    serializer_class = EmployeeExperienceSerializer
    filterset_fields = ['employee', 'sector', 'is_public_sector', 'is_current']
    ordering_fields = ['start_date', 'end_date']


class EmployeeTrainingViewSet(viewsets.ModelViewSet):
    queryset = EmployeeTraining.objects.select_related('employee').all()
    serializer_class = EmployeeTrainingSerializer
    filterset_fields = ['employee']
    ordering_fields = ['completed_at', 'hours']


class EmployeeEvaluationViewSet(viewsets.ModelViewSet):
    queryset = EmployeeEvaluation.objects.select_related('employee').all()
    serializer_class = EmployeeEvaluationSerializer
    filterset_fields = ['employee', 'year', 'result']
    ordering_fields = ['year', 'score']


class EmploymentRecordViewSet(viewsets.ModelViewSet):
    queryset = EmploymentRecord.objects.select_related('employee', 'entity', 'position').all()
    serializer_class = EmploymentRecordSerializer
    filterset_fields = ['employee', 'is_active', 'appointment_type', 'administrative_status']
    ordering_fields = ['appointment_date', 'termination_date']
