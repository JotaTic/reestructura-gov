from rest_framework.routers import DefaultRouter
from .views import TechnicalTeamMemberViewSet

router = DefaultRouter()
router.register('equipo-tecnico', TechnicalTeamMemberViewSet, basename='equipo-tecnico')
urlpatterns = router.urls
