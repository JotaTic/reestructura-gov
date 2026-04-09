from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    WorkloadSurveyViewSet,
    SurveyParticipantViewSet,
    SurveyActivityViewSet,
    public_survey_info,
    public_survey_submit,
)

router = DefaultRouter()
router.register('encuestas', WorkloadSurveyViewSet, basename='encuesta')
router.register('encuesta-participantes', SurveyParticipantViewSet, basename='encuesta-participante')
router.register('encuesta-actividades', SurveyActivityViewSet, basename='encuesta-actividad')

urlpatterns = router.urls + [
    # Portal público — sin autenticación
    path('publico/encuesta/<uuid:token>/', public_survey_info, name='public-survey-info'),
    path('publico/encuesta/<uuid:token>/enviar/', public_survey_submit, name='public-survey-submit'),
]
