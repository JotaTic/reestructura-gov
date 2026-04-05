from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EntityViewSet,
    DepartmentViewSet,
    TimelineActivityViewSet,
    RestructuringViewSet,
    login_view,
    logout_view,
    me_context,
)

router = DefaultRouter()
router.register('entidades', EntityViewSet, basename='entity')
router.register('dependencias', DepartmentViewSet, basename='department')
router.register('cronograma', TimelineActivityViewSet, basename='timeline')
router.register('reestructuraciones', RestructuringViewSet, basename='restructuring')

urlpatterns = [
    path('auth/login/', login_view, name='auth-login'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('me/context/', me_context, name='me-context'),
] + router.urls
