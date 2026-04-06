"""
Sprint 5 — Servicio de workflow para la máquina de estados de Restructuring.
"""
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.core.workflow import TRANSITIONS, Transition


def get_available_transitions(restructuring) -> list[dict]:
    """
    Devuelve todas las transiciones cuyo from_status == current status,
    con el campo 'blocked_by' (lista de razones).
    Si blocked_by está vacío, la transición es ejecutable.
    """
    result = []
    current = restructuring.status
    for t in TRANSITIONS:
        if t.from_status != current:
            continue
        blocked_by = []
        for precond in t.preconditions:
            try:
                reasons = precond(restructuring)
                blocked_by.extend(reasons)
            except Exception as e:
                blocked_by.append(f'Error al evaluar precondición: {e}')
        result.append({
            'from_status': t.from_status,
            'to_status': t.to_status,
            'name': t.name,
            'responsible_group': t.responsible_group,
            'description': t.description,
            'blocked_by': blocked_by,
        })
    return result


def execute_transition(restructuring, to_status: str, user) -> dict:
    """
    1. Verifica que exista una Transition (current, to_status) registrada.
    2. Corre todas sus preconditions → si alguna retorna razones, raise ValidationError.
    3. Cambia el status, actualiza current_status_since=now, guarda.
    4. ChangeLog se escribe automáticamente vía signal (Restructuring está en AUDIT_MODELS).
    5. Devuelve {'new_status': to_status, 'since': now, 'notifications': []}.
    """
    current = restructuring.status

    # Buscar transición
    transition: Transition | None = None
    for t in TRANSITIONS:
        if t.from_status == current and t.to_status == to_status:
            transition = t
            break

    if transition is None:
        raise ValidationError(
            f"No existe una transición de '{current}' a '{to_status}'."
        )

    # Verificar precondiciones
    all_blocked = []
    for precond in transition.preconditions:
        try:
            reasons = precond(restructuring)
            all_blocked.extend(reasons)
        except Exception as e:
            all_blocked.append(f'Error al evaluar precondición: {e}')

    if all_blocked:
        raise ValidationError({'blocked_by': all_blocked})

    # Aplicar transición
    now = timezone.now()
    restructuring.status = to_status
    restructuring.current_status_since = now
    restructuring.save(update_fields=['status', 'current_status_since', 'updated_at'])

    # Sprint 6 — Notificaciones de transición
    notifications_sent = 0
    try:
        from apps.notificaciones.services import notify_group
        notify_group(
            group_name=transition.responsible_group,
            kind='TRANSITION',
            message=f'El estudio técnico pasó a {restructuring.get_status_display()}',
            link=f'/reestructuraciones/{restructuring.id}/gobierno',
            entity=restructuring.entity,
            restructuring=restructuring,
        )
        notifications_sent = 1
    except Exception:
        pass

    return {
        'new_status': to_status,
        'new_status_display': restructuring.get_status_display(),
        'since': now.isoformat(),
        'notifications': notifications_sent,
    }
