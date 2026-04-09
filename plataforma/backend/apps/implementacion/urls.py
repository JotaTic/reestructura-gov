from rest_framework.routers import DefaultRouter
from .views import ImplementationPlanViewSet, ImplementationTaskViewSet

router = DefaultRouter()
router.register('planes-implementacion', ImplementationPlanViewSet, basename='plan-implementacion')
router.register('tareas-implementacion', ImplementationTaskViewSet, basename='tarea-implementacion')
urlpatterns = router.urls
