from rest_framework.routers import DefaultRouter
from .views import LegalNormViewSet

router = DefaultRouter()
router.register('base-legal', LegalNormViewSet, basename='legal-norm')

urlpatterns = router.urls
