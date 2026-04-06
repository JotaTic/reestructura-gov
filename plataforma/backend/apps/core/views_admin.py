"""
Vistas del módulo de Superadministración (Sprint 0).

Todos los endpoints aquí exigen `is_superuser=True`. No se exponen a usuarios
normales.
"""
from __future__ import annotations

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.models import ChangeLog
from apps.common.permissions import invalidate_matrix_cache

from .models import GroupModelPermission, UserEntityAccess
from .serializers_admin import (
    AdminUserSerializer,
    ChangeLogSerializer,
    GroupModelPermissionSerializer,
    GroupSerializer,
)

User = get_user_model()


class IsSuperUser(permissions.BasePermission):
    """Superadmin-only."""

    message = 'Solo disponible para superusuarios.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_superuser)


class AdminUserViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios (solo superadmin)."""

    permission_classes = [IsSuperUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().prefetch_related('groups', 'entity_access__entity').order_by('username')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'date_joined', 'is_active']

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Genera nueva password temporal y la devuelve una sola vez."""
        user = self.get_object()
        temp = AdminUserSerializer._generate_temp_password()
        user.set_password(temp)
        user.save(update_fields=['password'])
        return Response({'temporary_password': temp})


class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    """Listado de grupos — filas de la matriz."""

    permission_classes = [IsSuperUser]
    serializer_class = GroupSerializer
    queryset = Group.objects.all().order_by('name')


class GroupModelPermissionViewSet(viewsets.ModelViewSet):
    """Matriz `(group, app_label, model) → CRUD`."""

    permission_classes = [IsSuperUser]
    serializer_class = GroupModelPermissionSerializer
    queryset = GroupModelPermission.objects.select_related('group').all()
    filterset_fields = ['group', 'app_label', 'model']

    def perform_create(self, serializer):
        serializer.save()
        invalidate_matrix_cache()

    def perform_update(self, serializer):
        serializer.save()
        invalidate_matrix_cache()

    def perform_destroy(self, instance):
        instance.delete()
        invalidate_matrix_cache()

    @action(detail=False, methods=['get'], url_path='matrix')
    def matrix(self, request):
        """Vista agregada de la matriz: todos los modelos × todos los grupos."""
        models_list = _auditable_models()
        groups = list(Group.objects.all().order_by('name'))
        rows = {(p.group_id, p.app_label, p.model): p for p in self.get_queryset()}
        matrix = []
        for (app_label, model_name, verbose) in models_list:
            cells = []
            for g in groups:
                p = rows.get((g.id, app_label, model_name))
                cells.append({
                    'group_id': g.id,
                    'group_name': g.name,
                    'can_create': bool(p and p.can_create),
                    'can_read': bool(p and p.can_read),
                    'can_update': bool(p and p.can_update),
                    'can_delete': bool(p and p.can_delete),
                })
            matrix.append({
                'app_label': app_label,
                'model': model_name,
                'verbose_name': verbose,
                'cells': cells,
            })
        return Response({
            'groups': GroupSerializer(groups, many=True).data,
            'models': matrix,
        })

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """Guarda en una sola transacción una fila completa (un modelo × todos los grupos)."""
        app_label = request.data.get('app_label')
        model_name = request.data.get('model')
        cells = request.data.get('cells', [])
        if not app_label or not model_name:
            return Response({'detail': 'app_label y model son obligatorios.'}, status=400)
        with transaction.atomic():
            for cell in cells:
                GroupModelPermission.objects.update_or_create(
                    group_id=cell['group_id'],
                    app_label=app_label, model=model_name,
                    defaults={
                        'can_create': bool(cell.get('can_create')),
                        'can_read': bool(cell.get('can_read')),
                        'can_update': bool(cell.get('can_update')),
                        'can_delete': bool(cell.get('can_delete')),
                    },
                )
        invalidate_matrix_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='reset-defaults')
    def reset_defaults(self, request):
        """Re-ejecuta `seed_permissions` para volver a la matriz inicial."""
        from django.core.management import call_command
        call_command('seed_permissions', '--force')
        invalidate_matrix_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Historial de cambios (solo lectura, filtrable)."""

    permission_classes = [IsSuperUser]
    serializer_class = ChangeLogSerializer
    queryset = ChangeLog.objects.select_related('user', 'entity').all()
    filterset_fields = ['user', 'entity', 'app_label', 'model', 'action']
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['at']
    ordering = ['-at']


# --- Helpers compartidos ---------------------------------------------------


# Modelos que NO aparecen en la matriz (auxiliares / permisos Django nativos).
_MATRIX_EXCLUDED_APPS = {
    'admin', 'contenttypes', 'sessions', 'auth',  # auth user/group se incluyen manualmente
    'common',  # ChangeLog no es editable por matriz
}
_MATRIX_EXCLUDED_MODELS = {
    ('auth', 'permission'),
}
_MATRIX_EXTRA_MODELS = [
    ('auth', 'user', 'Usuario'),
    ('auth', 'group', 'Grupo'),
]


def _auditable_models() -> list[tuple[str, str, str]]:
    """Lista ordenada de (app_label, model_name, verbose_name_plural) a mostrar."""
    out: list[tuple[str, str, str]] = []
    for cfg in django_apps.get_app_configs():
        if cfg.label in _MATRIX_EXCLUDED_APPS:
            continue
        for model in cfg.get_models():
            key = (cfg.label, model._meta.model_name)
            if key in _MATRIX_EXCLUDED_MODELS:
                continue
            out.append((cfg.label, model._meta.model_name, str(model._meta.verbose_name_plural)))
    out.extend(_MATRIX_EXTRA_MODELS)
    out.sort(key=lambda t: (t[0], t[1]))
    return out
