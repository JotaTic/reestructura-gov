from rest_framework.routers import DefaultRouter
from .views import (
    DiagnosisViewSet,
    SwotItemViewSet,
    LegalReferenceViewSet,
    EnvironmentAnalysisViewSet,
)

router = DefaultRouter()
router.register('diagnosticos', DiagnosisViewSet, basename='diagnosis')
router.register('dofa', SwotItemViewSet, basename='swot')
router.register('marco-legal', LegalReferenceViewSet, basename='legal')
router.register('entornos', EnvironmentAnalysisViewSet, basename='environment')

urlpatterns = router.urls
