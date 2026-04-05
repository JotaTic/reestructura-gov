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

from apps.common.mixins import EntityScopedMixin
from apps.common.exports import export_response
from apps.common.module_exports import export_structure

from .models import Entity, Department, TimelineActivity, Restructuring
from .serializers import (
    EntitySerializer,
    DepartmentSerializer,
    TimelineActivitySerializer,
    RestructuringSerializer,
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

    @action(detail=True, methods=['get'], url_path=r'export-estructura/(?P<fmt>xlsx|docx)')
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
    # En el MVP, los usuarios autenticados ven todas las entidades. Cuando se
    # implementen permisos por grupo/tenant, aquí se filtran.
    entities = Entity.objects.all()
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
    })
