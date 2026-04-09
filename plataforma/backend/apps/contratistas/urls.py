from rest_framework.routers import DefaultRouter
from .views import ContractorViewSet, ContractorActivityViewSet

router = DefaultRouter()
router.register('contratistas', ContractorViewSet, basename='contratista')
router.register('contratista-actividades', ContractorActivityViewSet, basename='contratista-actividad')

urlpatterns = router.urls
