from rest_framework.routers import DefaultRouter
from .views import PayrollPlanViewSet, PayrollPositionViewSet

router = DefaultRouter()
router.register('planes', PayrollPlanViewSet, basename='payroll-plan')
router.register('cargos-planta', PayrollPositionViewSet, basename='payroll-position')

urlpatterns = router.urls
