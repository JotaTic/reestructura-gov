from rest_framework.routers import DefaultRouter
from .views import OfficialConsultationViewSet

router = DefaultRouter()
router.register('consultas', OfficialConsultationViewSet, basename='consulta')

urlpatterns = router.urls
