from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EntityViewSet,
    DepartmentViewSet,
    TimelineActivityViewSet,
    RestructuringViewSet,
    RestructuringObjectiveViewSet,
    login_view,
    logout_view,
    me_context,
)
from .views_admin import (
    AdminUserViewSet,
    GroupViewSet,
    GroupModelPermissionViewSet,
    ChangeLogViewSet,
)

router = DefaultRouter()
router.register('entidades', EntityViewSet, basename='entity')
router.register('dependencias', DepartmentViewSet, basename='department')
router.register('cronograma', TimelineActivityViewSet, basename='timeline')
router.register('reestructuraciones', RestructuringViewSet, basename='restructuring')
router.register('objetivos', RestructuringObjectiveViewSet, basename='restructuring-objective')

admin_router = DefaultRouter()
admin_router.register('users', AdminUserViewSet, basename='admin-users')
admin_router.register('groups', GroupViewSet, basename='admin-groups')
admin_router.register('permissions', GroupModelPermissionViewSet, basename='admin-permissions')
admin_router.register('audit', ChangeLogViewSet, basename='admin-audit')

urlpatterns = [
    path('auth/login/', login_view, name='auth-login'),
    path('auth/logout/', logout_view, name='auth-logout'),
    path('me/context/', me_context, name='me-context'),
] + router.urls + [path('superadmin/', include(admin_router.urls))]
