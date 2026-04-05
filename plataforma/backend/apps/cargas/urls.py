from rest_framework.routers import DefaultRouter
from .views import WorkloadMatrixViewSet, WorkloadEntryViewSet

router = DefaultRouter()
router.register('matrices', WorkloadMatrixViewSet, basename='matriz')
router.register('cargas', WorkloadEntryViewSet, basename='carga')

urlpatterns = router.urls
