from rest_framework.routers import DefaultRouter
from .views import ProcedureViewSet, ProcedureStepViewSet

router = DefaultRouter()
router.register(r'procedimientos', ProcedureViewSet, basename='procedimientos')
router.register(r'procedimientos-pasos', ProcedureStepViewSet, basename='procedimientos-pasos')

urlpatterns = router.urls
