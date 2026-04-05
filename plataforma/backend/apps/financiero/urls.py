from rest_framework.routers import DefaultRouter
from .views import FiscalYearViewSet

router = DefaultRouter()
router.register('anios-fiscales', FiscalYearViewSet, basename='fiscal-year')

urlpatterns = router.urls
