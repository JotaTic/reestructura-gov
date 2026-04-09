from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.mixins import EntityScopedMixin

from .models import WorkloadSurvey, SurveyParticipant, SurveyActivity
from .serializers import (
    WorkloadSurveySerializer,
    SurveyParticipantSerializer,
    SurveyActivitySerializer,
    PublicSurveyInfoSerializer,
    PublicActivitySubmitSerializer,
)
from .services import consolidate_survey_to_matrix


class WorkloadSurveyViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    queryset = WorkloadSurvey.objects.select_related('entity', 'matrix').all()
    serializer_class = WorkloadSurveySerializer
    filterset_fields = ['matrix', 'status']
    search_fields = ['name']
    ordering_fields = ['created_at', 'deadline']

    @action(detail=True, methods=['post'], url_path='abrir')
    def open_survey(self, request, pk=None):
        survey = self.get_object()
        survey.status = WorkloadSurvey.Status.OPEN
        survey.save(update_fields=['status'])
        return Response({'status': 'OPEN'})

    @action(detail=True, methods=['post'], url_path='cerrar')
    def close_survey(self, request, pk=None):
        survey = self.get_object()
        survey.status = WorkloadSurvey.Status.CLOSED
        survey.save(update_fields=['status'])
        return Response({'status': 'CLOSED'})

    @action(detail=True, methods=['post'], url_path='consolidar')
    def consolidate(self, request, pk=None):
        """Consolida las actividades aprobadas en la matriz de cargas."""
        survey = self.get_object()
        result = consolidate_survey_to_matrix(survey)
        return Response(result)

    @action(detail=True, methods=['get'], url_path='resumen')
    def summary(self, request, pk=None):
        """Resumen de respuestas para revisión del técnico."""
        survey = self.get_object()
        participants = survey.participants.prefetch_related('activities', 'department')
        data = []
        for p in participants:
            activities = p.activities.all()
            total_hh = sum(float(a.hh_month) for a in activities)
            data.append({
                'participant_id': p.id,
                'full_name': p.full_name,
                'link_type': p.link_type,
                'link_type_display': p.get_link_type_display(),
                'department_name': p.department.name,
                'is_contractor': p.is_contractor,
                'submitted': p.submitted,
                'activities_count': activities.count(),
                'total_hh_month': round(total_hh, 2),
                'core_activities': activities.filter(is_core_activity=True).count(),
                'activities': SurveyActivitySerializer(activities, many=True).data,
            })
        return Response({
            'survey_id': survey.id,
            'survey_name': survey.name,
            'total_participants': len(data),
            'submitted_count': sum(1 for p in data if p['submitted']),
            'participants': data,
        })


class SurveyParticipantViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    queryset = SurveyParticipant.objects.select_related(
        'survey', 'survey__entity', 'department'
    ).all()
    serializer_class = SurveyParticipantSerializer
    filterset_fields = ['survey', 'link_type', 'submitted', 'department']
    search_fields = ['full_name', 'id_number', 'email']
    entity_field = 'survey__entity'

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """Crear múltiples participantes de una vez."""
        items = request.data.get('participants', [])
        created = []
        errors = []
        for item in items:
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                obj = serializer.save()
                created.append(SurveyParticipantSerializer(obj).data)
            else:
                errors.append({'item': item, 'errors': serializer.errors})
        return Response(
            {'created': len(created), 'errors': errors, 'participants': created},
            status=status.HTTP_201_CREATED if not errors else status.HTTP_207_MULTI_STATUS,
        )


class SurveyActivityViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """CRUD de actividades — para que el admin revise y apruebe."""
    queryset = SurveyActivity.objects.select_related(
        'participant', 'participant__survey', 'participant__survey__entity'
    ).all()
    serializer_class = SurveyActivitySerializer
    filterset_fields = ['participant', 'approved', 'consolidated', 'is_core_activity']
    search_fields = ['activity', 'process']
    entity_field = 'participant__survey__entity'

    @action(detail=False, methods=['post'], url_path='aprobar-bulk')
    def approve_bulk(self, request):
        """Aprobar múltiples actividades."""
        ids = request.data.get('ids', [])
        updated = SurveyActivity.objects.filter(id__in=ids).update(approved=True)
        return Response({'approved': updated})


# ---- Portal público (sin autenticación) ----

@api_view(['GET'])
@permission_classes([AllowAny])
def public_survey_info(request, token):
    """Obtiene info de la encuesta para el participante (sin auth)."""
    try:
        participant = SurveyParticipant.objects.select_related(
            'survey', 'survey__entity', 'department',
        ).get(token=token)
    except SurveyParticipant.DoesNotExist:
        return Response(
            {'detail': 'Enlace no válido o expirado.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not participant.survey.is_active:
        return Response(
            {'detail': 'Esta encuesta ya no está activa.', 'closed': True},
            status=status.HTTP_410_GONE,
        )

    serializer = PublicSurveyInfoSerializer(participant)
    # Include existing activities if any
    activities = SurveyActivitySerializer(participant.activities.all(), many=True).data
    data = serializer.data
    data['activities'] = activities
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_survey_submit(request, token):
    """El participante envía sus actividades (sin auth)."""
    try:
        participant = SurveyParticipant.objects.select_related('survey').get(token=token)
    except SurveyParticipant.DoesNotExist:
        return Response(
            {'detail': 'Enlace no válido o expirado.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not participant.survey.is_active:
        return Response(
            {'detail': 'Esta encuesta ya no está activa.'},
            status=status.HTTP_410_GONE,
        )

    if participant.submitted:
        return Response(
            {'detail': 'Ya enviaste tu respuesta. Contacta al administrador para modificarla.'},
            status=status.HTTP_409_CONFLICT,
        )

    activities_data = request.data.get('activities', [])
    if not activities_data:
        return Response(
            {'detail': 'Debes registrar al menos una actividad.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created = []
    errors = []
    for idx, item in enumerate(activities_data):
        serializer = PublicActivitySubmitSerializer(data=item)
        if serializer.is_valid():
            obj = serializer.save(participant=participant)
            created.append(obj.id)
        else:
            errors.append({'index': idx, 'errors': serializer.errors})

    if errors and not created:
        return Response({'detail': 'Errores en todas las actividades.', 'errors': errors},
                        status=status.HTTP_400_BAD_REQUEST)

    # Marcar como enviado
    if not errors:
        participant.submitted = True
        participant.submitted_at = timezone.now()
        participant.save(update_fields=['submitted', 'submitted_at'])

    return Response({
        'created': len(created),
        'errors': errors,
        'submitted': participant.submitted,
    }, status=status.HTTP_201_CREATED)
