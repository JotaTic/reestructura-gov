"""
Sprint 6 — ViewSet de Notificaciones per-user.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer
from .services import mark_read


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de notificaciones filtrado por request.user.
    No usa EntityScopedMixin — las notificaciones son per-user.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related('entity', 'restructuring')

    @action(detail=False, methods=['post'], url_path='marcar-leidas')
    def marcar_leidas(self, request):
        """
        POST /api/notificaciones/marcar-leidas/
        Body: {ids: [int, ...]} o {} para marcar todas.
        """
        ids = request.data.get('ids', None)
        if ids is not None and not isinstance(ids, list):
            return Response({'detail': 'ids debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)
        count = mark_read(request.user, notification_ids=ids)
        return Response({'marked': count})

    @action(detail=False, methods=['get'], url_path='sin-leer')
    def sin_leer(self, request):
        """
        GET /api/notificaciones/sin-leer/
        Devuelve el conteo de notificaciones no leídas del usuario.
        """
        count = Notification.objects.filter(user=request.user, read=False).count()
        return Response({'unread_count': count})
