from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet

router = DefaultRouter()
router.register(r'documentos', DocumentViewSet, basename='documentos')

urlpatterns = router.urls
