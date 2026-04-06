from rest_framework.routers import DefaultRouter
from .views import EligibilityViewSet

router = DefaultRouter()
router.register(r'analisis/elegibilidad', EligibilityViewSet, basename='analisis-elegibilidad')

urlpatterns = router.urls
