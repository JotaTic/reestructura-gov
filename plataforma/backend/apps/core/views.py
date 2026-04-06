from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, action
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


class CsrfExemptSessionAuth(SessionAuthentication):
    """Variante sin el enforce_csrf — solo para el endpoint de login del MVP."""
    def enforce_csrf(self, request):
        return  # noop

from django.http import HttpResponse

from apps.common.mixins import EntityScopedMixin, RestructuringScopedMixin, get_user_allowed_entity_ids
from apps.common.exports import export_response, EXPORT_RENDERERS, DOCX_CONTENT_TYPE
from apps.common.module_exports import export_structure

from .models import Entity, Department, TimelineActivity, Restructuring, UserEntityAccess, RestructuringObjective
from .serializers import (
    EntitySerializer,
    DepartmentSerializer,
    TimelineActivitySerializer,
    RestructuringSerializer,
    RestructuringObjectiveSerializer,
)


class EntityViewSet(viewsets.ModelViewSet):
    """
    Entidades: endpoint GLOBAL (no usa el mixin de aislamiento).
    Aquí es donde el usuario escoge su entidad activa.
    """
    queryset = Entity.objects.all().prefetch_related('departments')
    serializer_class = EntitySerializer
    filterset_fields = ['order', 'legal_nature', 'municipality_category']
    search_fields = ['name', 'acronym', 'nit']
    ordering_fields = ['name', 'created_at']

    @action(detail=True, methods=['get'], url_path='reestructuraciones')
    def list_restructurings(self, request, pk=None):
        entity = self.get_object()
        qs = entity.restructurings.all()
        return Response(RestructuringSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path=r'export-estructura/(?P<fmt>xlsx|docx)',
            renderer_classes=EXPORT_RENDERERS)
    def export_structure(self, request, pk=None, fmt=None):
        """M9 — Estructura orgánica: árbol de dependencias de la entidad."""
        entity = self.get_object()
        title, meta, sections, base, ctx = export_structure(entity, entity.departments.all())
        return export_response(fmt, title, meta, sections, base, ctx)


class RestructuringViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    """
    Reestructuraciones: filtradas por la entidad activa en cabecera X-Entity-Id.
    """
    queryset = Restructuring.objects.select_related('entity').all()
    serializer_class = RestructuringSerializer
    search_fields = ['name', 'code']
    ordering_fields = ['reference_date', 'name', 'status']

    def perform_create(self, serializer):
        entity_id = self.get_active_entity_id()
        serializer.save(entity_id=entity_id, created_by=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=['get'], url_path='estudio-tecnico',
            renderer_classes=EXPORT_RENDERERS)
    def technical_study(self, request, pk=None):
        """
        GET /api/reestructuraciones/<id>/estudio-tecnico/
        Genera y descarga el estudio técnico consolidado (DOCX).
        """
        restr = self.get_object()
        from apps.analisis.consolidator import build_technical_study
        content = build_technical_study(restr)
        return HttpResponse(
            content,
            content_type=DOCX_CONTENT_TYPE,
            headers={'Content-Disposition': f'attachment; filename="estudio_tecnico_{restr.id}.docx"'},
        )

    @action(detail=True, methods=['get'], url_path='transiciones')
    def transiciones(self, request, pk=None):
        """
        GET /api/reestructuraciones/<id>/transiciones/
        Devuelve las transiciones disponibles desde el estado actual,
        con campo 'blocked_by' (vacío si ejecutable).
        """
        restr = self.get_object()
        from apps.core.services.workflow import get_available_transitions
        transitions = get_available_transitions(restr)
        return Response(transitions)

    @action(detail=True, methods=['post'], url_path='transicionar')
    def transicionar(self, request, pk=None):
        """
        POST /api/reestructuraciones/<id>/transicionar/
        Body: {to_status: "DIAGNOSTICO_COMPLETO"}
        Ejecuta la transición si el usuario tiene el grupo requerido (o es superuser).
        """
        restr = self.get_object()
        to_status = request.data.get('to_status', '').strip()
        if not to_status:
            return Response({'detail': "El campo 'to_status' es obligatorio."}, status=400)

        # Verificar que la transición existe y el grupo del usuario
        from apps.core.workflow import TRANSITIONS
        from apps.core.services.workflow import execute_transition
        from django.core.exceptions import ValidationError

        transition = None
        for t in TRANSITIONS:
            if t.from_status == restr.status and t.to_status == to_status:
                transition = t
                break

        if transition is None:
            return Response(
                {'detail': f"No existe transición de '{restr.status}' a '{to_status}'."},
                status=400,
            )

        # Verificar grupo responsable (superuser omite)
        user = request.user
        if not user.is_superuser:
            user_groups = set(user.groups.values_list('name', flat=True))
            if transition.responsible_group not in user_groups:
                return Response(
                    {
                        'detail': (
                            f"Esta transición requiere pertenecer al grupo "
                            f"'{transition.responsible_group}'."
                        )
                    },
                    status=403,
                )

        try:
            result = execute_transition(restr, to_status, user)
        except ValidationError as exc:
            return Response({'detail': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)}, status=400)

        return Response(result)

    @action(detail=True, methods=['get'], url_path='historial')
    def historial(self, request, pk=None):
        """
        GET /api/reestructuraciones/<id>/historial/
        Returns ChangeLog entries for this restructuring (status transitions).
        """
        restr = self.get_object()
        from apps.common.models import ChangeLog
        logs = (
            ChangeLog.objects
            .filter(model='restructuring', object_id=str(restr.id))
            .select_related('user')
            .order_by('-at')[:50]
        )
        data = []
        for log in logs:
            before_status = (log.before_json or {}).get('status')
            after_status = (log.after_json or {}).get('status')
            data.append({
                'id': log.id,
                'action': log.action,
                'action_display': log.get_action_display(),
                'user': log.user.username if log.user else None,
                'at': log.at.isoformat(),
                'before_status': before_status,
                'after_status': after_status,
            })
        return Response(data)


class DepartmentViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    queryset = Department.objects.select_related('entity', 'parent').all()
    serializer_class = DepartmentSerializer
    filterset_fields = ['parent']
    search_fields = ['name', 'code']
    ordering_fields = ['order', 'name']


class TimelineActivityViewSet(EntityScopedMixin, viewsets.ModelViewSet):
    queryset = TimelineActivity.objects.select_related('entity').all()
    serializer_class = TimelineActivitySerializer
    filterset_fields = ['status']
    ordering_fields = ['order', 'start_date']


class RestructuringObjectiveViewSet(RestructuringScopedMixin, viewsets.ModelViewSet):
    """
    Objetivos de una reestructuración.

    Requiere cabeceras X-Entity-Id y X-Restructuring-Id.
    GET /api/objetivos/definitions/ — sin autenticación especial —
    devuelve el diccionario completo de OBJECTIVE_DEFINITIONS.
    """

    queryset = RestructuringObjective.objects.select_related('restructuring').all()
    serializer_class = RestructuringObjectiveSerializer
    filterset_fields = ['kind', 'priority']
    search_fields = ['description', 'indicator']
    ordering_fields = ['priority', 'kind', 'deadline']

    # entity_field en RestructuringObjective → a través de restructuring
    entity_field = 'restructuring__entity'
    restructuring_field = 'restructuring'

    def perform_create(self, serializer):
        from .models import Restructuring
        entity_id = self.get_active_entity_id()
        rid = self.get_active_restructuring_id()
        if not Restructuring.objects.filter(id=rid, entity_id=entity_id).exists():
            from apps.common.mixins import _ContextError
            raise _ContextError(
                'La reestructuración no pertenece a la entidad activa.',
                code='restructuring_mismatch',
            )
        serializer.save(restructuring_id=rid)

    @action(
        detail=False, methods=['get'],
        url_path='definitions',
        permission_classes=[IsAuthenticated],
    )
    def definitions(self, request):
        """Devuelve el diccionario OBJECTIVE_DEFINITIONS para el checklist del frontend."""
        from .objectives import OBJECTIVE_DEFINITIONS
        return Response(OBJECTIVE_DEFINITIONS)


# ---------------- Auth + contexto ----------------

@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuth])
@permission_classes([AllowAny])
def login_view(request):
    """POST /api/auth/login/ {username, password} → inicia sesión de Django."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    if not username or not password:
        return Response({'detail': 'Usuario y contraseña son obligatorios.'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'detail': 'Credenciales inválidas.'}, status=401)
    login(request, user)
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'groups': list(user.groups.values_list('name', flat=True)),
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_context(request):
    """
    Bootstrap del frontend: devuelve el usuario, el listado de entidades a las
    que tiene acceso y (si viene) valida la entidad/reestructuración activas.
    """
    user = request.user
    allowed = get_user_allowed_entity_ids(user)
    if allowed is None:
        entities = Entity.objects.all()
        default_entity_id = None
    else:
        entities = Entity.objects.filter(id__in=allowed)
        default_access = UserEntityAccess.objects.filter(user=user, is_default=True).first()
        default_entity_id = default_access.entity_id if default_access else None
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'groups': list(user.groups.values_list('name', flat=True)),
        },
        'entities': EntitySerializer(entities, many=True).data,
        'default_entity_id': default_entity_id,
    })
