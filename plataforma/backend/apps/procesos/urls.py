from rest_framework.routers import DefaultRouter
from .views import ProcessMapViewSet, ProcessViewSet, ValueChainLinkViewSet

router = DefaultRouter()
router.register('mapas-procesos', ProcessMapViewSet, basename='process-map')
router.register('procesos', ProcessViewSet, basename='process')
router.register('cadena-valor', ValueChainLinkViewSet, basename='value-chain')

urlpatterns = router.urls
