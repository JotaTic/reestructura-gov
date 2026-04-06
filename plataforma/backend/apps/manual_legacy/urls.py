from rest_framework.routers import DefaultRouter
from .views import LegacyManualViewSet, LegacyManualRoleViewSet, LegacyManualFunctionViewSet

router = DefaultRouter()
router.register(r'manuales-vigentes', LegacyManualViewSet, basename='manuales-vigentes')
router.register(r'manual-vigente-cargos', LegacyManualRoleViewSet, basename='manual-vigente-cargos')
router.register(r'manual-vigente-funciones', LegacyManualFunctionViewSet, basename='manual-vigente-funciones')

urlpatterns = router.urls
