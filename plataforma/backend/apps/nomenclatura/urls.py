from rest_framework.routers import DefaultRouter
from .views import JobNomenclatureViewSet

router = DefaultRouter()
router.register('nomenclatura', JobNomenclatureViewSet, basename='nomenclatura')

urlpatterns = router.urls
