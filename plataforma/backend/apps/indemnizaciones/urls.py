from rest_framework.routers import DefaultRouter
from .views import SuppressionAnalysisViewSet, SuppressionCostViewSet

router = DefaultRouter()
router.register('analisis-supresion', SuppressionAnalysisViewSet, basename='analisis-supresion')
router.register('costos-supresion', SuppressionCostViewSet, basename='costo-supresion')
urlpatterns = router.urls
