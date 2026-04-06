from rest_framework.routers import DefaultRouter
from .views import WorkloadMatrixViewSet, WorkloadEntryViewSet, ManualFuncionesOverrideViewSet

router = DefaultRouter()
router.register('matrices', WorkloadMatrixViewSet, basename='matriz')
router.register('cargas', WorkloadEntryViewSet, basename='carga')
router.register('manual-funciones-override', ManualFuncionesOverrideViewSet, basename='manual-funciones-override')

urlpatterns = router.urls
