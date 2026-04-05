from rest_framework.routers import DefaultRouter
from .views import ProtectedEmployeeViewSet

router = DefaultRouter()
router.register('reten-social', ProtectedEmployeeViewSet, basename='reten')

urlpatterns = router.urls
