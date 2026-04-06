from rest_framework.routers import DefaultRouter

from .views import PersonnelCommitteeViewSet, CommitteeMemberViewSet, CommitteeMeetingViewSet, UnionCommunicationViewSet

router = DefaultRouter()
router.register('comision-personal', PersonnelCommitteeViewSet, basename='comision-personal')
router.register('comision-miembros', CommitteeMemberViewSet, basename='comision-miembros')
router.register('comision-reuniones', CommitteeMeetingViewSet, basename='comision-reuniones')
router.register('comunicaciones-sindicales', UnionCommunicationViewSet, basename='comunicaciones-sindicales')

urlpatterns = router.urls
