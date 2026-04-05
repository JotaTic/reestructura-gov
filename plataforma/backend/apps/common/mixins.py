"""
Mixins de aislamiento por entidad y reestructuración.

Uso:
    class WorkloadMatrixViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
        ...

El mixin exige las cabeceras:
    X-Entity-Id: <id>
    X-Restructuring-Id: <id>   (solo RestructuringScopedMixin)

Como fallback acepta query params ?entity= y ?restructuring=.

Cualquier intento de operar sin contexto válido retorna 403 con un payload
estructurado para que el frontend pueda detectarlo y redirigir al selector.
"""
from rest_framework.exceptions import PermissionDenied


class _ContextError(PermissionDenied):
    """403 con payload estructurado que el frontend puede interpretar."""

    def __init__(self, detail: str, code: str):
        super().__init__(detail={'detail': detail, 'code': code})
        self.status_code = 403


class EntityScopedMixin:
    """
    Filtra el queryset por la entidad activa (cabecera o query param) y fuerza
    que cualquier `create/update` opere sobre esa misma entidad.

    Sobrescribe `entity_field` si el FK al entity se resuelve a través de un
    padre (ej. `matrix__entity` para `WorkloadEntry`).
    """

    entity_field = 'entity'

    # ---- Resolución del contexto ----

    def _resolve_header(self, header_name: str, qp_name: str) -> int:
        value = (
            self.request.headers.get(header_name)
            or self.request.query_params.get(qp_name)
        )
        if not value:
            raise _ContextError(
                f'Debes seleccionar una {qp_name} para continuar.',
                code=f'{qp_name}_required',
            )
        try:
            return int(value)
        except (TypeError, ValueError):
            raise _ContextError(f'{qp_name} inválida.', code=f'{qp_name}_invalid')

    def get_active_entity_id(self) -> int:
        return self._resolve_header('X-Entity-Id', 'entity')

    # ---- Queryset ----

    def get_queryset(self):
        qs = super().get_queryset()
        entity_id = self.get_active_entity_id()
        return qs.filter(**{f'{self.entity_field}_id': entity_id})

    # ---- Creación ----

    def perform_create(self, serializer):
        entity_id = self.get_active_entity_id()
        body_entity = serializer.validated_data.get('entity')
        if body_entity is not None and getattr(body_entity, 'id', body_entity) != entity_id:
            raise _ContextError(
                'No puedes crear registros en otra entidad.',
                code='entity_mismatch',
            )
        # Solo inyectamos entity_id si el modelo tiene FK directo 'entity'.
        if self.entity_field == 'entity':
            serializer.save(entity_id=entity_id)
        else:
            serializer.save()


class RestructuringScopedMixin(EntityScopedMixin):
    """
    Extiende el anterior: además exige la cabecera X-Restructuring-Id y valida
    que la reestructuración pertenezca a la entidad activa.
    """

    restructuring_field = 'restructuring'

    def get_active_restructuring_id(self) -> int:
        return self._resolve_header('X-Restructuring-Id', 'restructuring')

    def get_queryset(self):
        qs = super().get_queryset()
        rid = self.get_active_restructuring_id()
        return qs.filter(**{f'{self.restructuring_field}_id': rid})

    def perform_create(self, serializer):
        from apps.core.models import Restructuring

        entity_id = self.get_active_entity_id()
        rid = self.get_active_restructuring_id()
        if not Restructuring.objects.filter(id=rid, entity_id=entity_id).exists():
            raise _ContextError(
                'La reestructuración no pertenece a la entidad activa.',
                code='restructuring_mismatch',
            )
        body_entity = serializer.validated_data.get('entity')
        if body_entity is not None and getattr(body_entity, 'id', body_entity) != entity_id:
            raise _ContextError(
                'No puedes crear registros en otra entidad.',
                code='entity_mismatch',
            )
        if self.restructuring_field == 'restructuring' and self.entity_field == 'entity':
            serializer.save(entity_id=entity_id, restructuring_id=rid)
        else:
            serializer.save()
