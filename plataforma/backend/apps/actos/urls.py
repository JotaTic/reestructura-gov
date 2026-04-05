from rest_framework.routers import DefaultRouter
from .views import ActTemplateViewSet, ActDraftViewSet

router = DefaultRouter()
router.register('plantillas-actos', ActTemplateViewSet, basename='act-template')
router.register('actos', ActDraftViewSet, basename='act-draft')

urlpatterns = router.urls
