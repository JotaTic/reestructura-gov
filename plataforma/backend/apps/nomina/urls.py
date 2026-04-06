from rest_framework.routers import DefaultRouter

from .views import SalaryScaleViewSet, PrestationalFactorViewSet, EntitySalaryConfigViewSet

router = DefaultRouter()
router.register('escalas-salariales', SalaryScaleViewSet, basename='salary-scale')
router.register('factores-prestacionales', PrestationalFactorViewSet, basename='prestational-factor')
router.register('config-salarial', EntitySalaryConfigViewSet, basename='entity-salary-config')

urlpatterns = router.urls
