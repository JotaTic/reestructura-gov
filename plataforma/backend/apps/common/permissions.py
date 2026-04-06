"""
`MatrixPermission`: permission class DRF que consulta la matriz
`core.GroupModelPermission(group, app_label, model, C/R/U/D)` en cada request.

Reglas:
- `is_superuser=True` → siempre pasa.
- Si la vista no expone un modelo resoluble (endpoints "globales" como login,
  me/context, o actions sin queryset) → pasa (la vista sigue exigiendo
  `IsAuthenticated`).
- Si el modelo es resoluble: OR lógico entre los grupos del usuario sobre la
  celda correspondiente. Si ningún grupo otorga el bit requerido → niega.
- Se cachea la lista de grupos del usuario y las filas de la matriz por 60s
  para no martillar la DB en cada request.
"""
from __future__ import annotations

from django.core.cache import cache
from rest_framework import permissions

_SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS'}
_WRITE_CREATE = {'POST'}
_WRITE_UPDATE = {'PUT', 'PATCH'}
_WRITE_DELETE = {'DELETE'}

_CACHE_TTL = 60  # segundos


def _method_bit(method: str) -> str:
    if method in _SAFE_METHODS:
        return 'can_read'
    if method in _WRITE_CREATE:
        return 'can_create'
    if method in _WRITE_UPDATE:
        return 'can_update'
    if method in _WRITE_DELETE:
        return 'can_delete'
    return 'can_read'


def _resolve_model(view):
    """Devuelve (app_label, model_name) o None si la vista no apunta a un modelo."""
    # ViewSets con queryset
    qs = getattr(view, 'queryset', None)
    model = getattr(qs, 'model', None) if qs is not None else None
    if model is None:
        # Algunos viewsets sobrecargan get_queryset sin `queryset` atributo
        try:
            qs = view.get_queryset()
            model = qs.model
        except Exception:
            model = None
    if model is None:
        serializer_class = getattr(view, 'serializer_class', None)
        meta = getattr(serializer_class, 'Meta', None) if serializer_class else None
        model = getattr(meta, 'model', None)
    if model is None:
        return None
    return (model._meta.app_label, model._meta.model_name)


def _matrix_for_groups(group_ids: tuple[int, ...]) -> dict[tuple[str, str], dict[str, bool]]:
    """Lee todas las celdas de los grupos dados y las fusiona con OR lógico."""
    if not group_ids:
        return {}
    key = f'matrix_perm:v1:{",".join(str(g) for g in sorted(group_ids))}'
    cached = cache.get(key)
    if cached is not None:
        return cached

    from apps.core.models import GroupModelPermission  # import tardío

    out: dict[tuple[str, str], dict[str, bool]] = {}
    rows = GroupModelPermission.objects.filter(group_id__in=group_ids).values(
        'app_label', 'model', 'can_create', 'can_read', 'can_update', 'can_delete'
    )
    for row in rows:
        k = (row['app_label'], row['model'])
        cur = out.setdefault(k, {
            'can_create': False, 'can_read': False,
            'can_update': False, 'can_delete': False,
        })
        cur['can_create'] |= row['can_create']
        cur['can_read'] |= row['can_read']
        cur['can_update'] |= row['can_update']
        cur['can_delete'] |= row['can_delete']
    cache.set(key, out, _CACHE_TTL)
    return out


def invalidate_matrix_cache():
    """Llamar tras editar la matriz para refrescar el cache."""
    # El backend de cache por defecto en dev es LocMem; no soporta wildcard.
    # Como estrategia mínima, cambiamos la versión del key prefix vía otro key.
    cache.delete_pattern('matrix_perm:v1:*') if hasattr(cache, 'delete_pattern') else None
    # Fallback: borrar el cache completo del proceso actual.
    try:
        cache.clear()
    except Exception:  # pragma: no cover
        pass


class MatrixPermission(permissions.BasePermission):
    """Permission class DRF basada en `GroupModelPermission`."""

    message = 'No tienes permiso sobre este recurso (matriz CRUD).'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        resolved = _resolve_model(view)
        if resolved is None:
            # Endpoint sin modelo resoluble (auth/me/context, custom actions):
            # lo dejamos pasar — la vista ya exige `IsAuthenticated`.
            return True
        app_label, model_name = resolved
        group_ids = tuple(user.groups.values_list('id', flat=True))
        matrix = _matrix_for_groups(group_ids)
        cell = matrix.get((app_label, model_name))
        if cell is None:
            return False
        bit = _method_bit(request.method)
        return bool(cell.get(bit, False))

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
