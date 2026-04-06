from rest_framework.routers import DefaultRouter
from .views import ScenarioViewSet

router = DefaultRouter()
router.register('simulador', ScenarioViewSet, basename='scenario')

urlpatterns = router.urls
