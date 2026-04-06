"""
Sprint 6 — Servicios de notificaciones.

notify: crea una Notification (y envía email si está configurado).
notify_group: notifica a todos los usuarios del grupo.
mark_read: marca notificaciones como leídas.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.contrib.auth.models import User


def notify(
    user,
    kind: str,
    message: str,
    link: str = '',
    entity=None,
    restructuring=None,
) -> 'Notification':
    """
    Crea una Notification para el usuario.
    Si el backend de email está configurado y el usuario tiene email,
    intenta enviar un email (captura cualquier excepción).
    """
    from apps.notificaciones.models import Notification

    notif = Notification.objects.create(
        user=user,
        kind=kind,
        message=message,
        link=link,
        entity=entity,
        restructuring=restructuring,
        read=False,
    )

    # Envío de email opcional
    if getattr(user, 'email', None):
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            subject = f'[ReEstructura.Gov] {notif.get_kind_display()}'
            body = f'{message}\n\nAccede aquí: {link or "—"}'
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@reestructura.gov.co')
            send_mail(subject, body, from_email, [user.email], fail_silently=True)
        except Exception:
            pass  # No interrumpir si el email falla

    return notif


def notify_group(
    group_name: str,
    kind: str,
    message: str,
    link: str = '',
    entity=None,
    restructuring=None,
) -> list:
    """
    Notifica a todos los usuarios del grupo (por nombre de grupo Django).
    Devuelve lista de Notification creadas.
    """
    from django.contrib.auth.models import Group

    notifications = []
    try:
        group = Group.objects.get(name=group_name)
    except Group.DoesNotExist:
        return notifications

    for user in group.user_set.filter(is_active=True):
        notif = notify(
            user=user,
            kind=kind,
            message=message,
            link=link,
            entity=entity,
            restructuring=restructuring,
        )
        notifications.append(notif)

    return notifications


def mark_read(user, notification_ids=None) -> int:
    """
    Marca como leídas las notificaciones del usuario.
    Si notification_ids es None, marca TODAS las no leídas.
    Devuelve el número de notificaciones actualizadas.
    """
    from apps.notificaciones.models import Notification

    qs = Notification.objects.filter(user=user, read=False)
    if notification_ids is not None:
        qs = qs.filter(pk__in=notification_ids)
    count = qs.update(read=True)
    return count
