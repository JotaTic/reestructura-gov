from rest_framework.routers import DefaultRouter
from .views import LegalMandateViewSet, MandateComplianceViewSet

router = DefaultRouter()
router.register(r'mandatos', LegalMandateViewSet, basename='mandatos')
router.register(r'mandato-cumplimiento', MandateComplianceViewSet, basename='mandato-cumplimiento')

urlpatterns = router.urls
