"""
Signals que escriben `ChangeLog` automáticamente para los modelos registrados
en `apps.common.audit.AUDIT_MODELS`.

Se conectan en `apps.common.apps.CommonConfig.ready()`.

Extraer el usuario actual requiere middleware adicional; para simplificar, en
cada request el serializer/view llena `_audit_user` en la instancia antes de
guardar. Si no está, se persiste como None.
"""
from __future__ import annotations

import threading

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver

from .audit import AUDIT_MODELS

# Thread-local para propagar el request.user al signal sin acoplar al view.
_local = threading.local()


def set_audit_user(user):
    """Llamado por el middleware de auditoría en cada request."""
    _local.user = user


def get_audit_user():
    return getattr(_local, 'user', None)


def _is_audited(instance) -> bool:
    meta = instance._meta
    return f'{meta.app_label}.{meta.model_name}' in {m.lower() for m in AUDIT_MODELS}


def _serialize(instance) -> dict:
    """Snapshot simple de campos concretos del modelo (FKs → *_id)."""
    from django.db.models import FileField
    out: dict = {}
    for field in instance._meta.concrete_fields:
        try:
            value = field.value_from_object(instance)
        except Exception:
            value = None
        # JSONField acepta primitivas; convertir fechas/datetimes a ISO.
        if hasattr(value, 'isoformat'):
            value = value.isoformat()
        # FileField devuelve FieldFile — serializar solo como string (nombre del archivo).
        elif isinstance(field, FileField):
            value = str(value) if value else ''
        out[field.attname] = value
    return out


def _resolve_entity(instance):
    """Intenta encontrar el entity_id asociado al registro para indexación."""
    for attr in ('entity_id', 'entity'):
        val = getattr(instance, attr, None)
        if val is None:
            continue
        if hasattr(val, 'id'):
            return val
        # Es un id; devolvemos None y dejamos el log con entity_id crudo.
        return None
    return None


@receiver(pre_save)
def _capture_pre_save(sender, instance, **kwargs):
    if not _is_audited(instance):
        return
    if not instance.pk:
        instance._audit_before = None
        return
    try:
        old = sender.objects.get(pk=instance.pk)
        instance._audit_before = _serialize(old)
    except sender.DoesNotExist:  # pragma: no cover
        instance._audit_before = None


@receiver(post_save)
def _log_post_save(sender, instance, created, **kwargs):
    if not _is_audited(instance):
        return
    from .models import ChangeLog

    ChangeLog.objects.create(
        user=get_audit_user(),
        entity=_resolve_entity(instance),
        app_label=sender._meta.app_label,
        model=sender._meta.model_name,
        object_id=str(instance.pk),
        action=ChangeLog.Action.CREATE if created else ChangeLog.Action.UPDATE,
        before_json=None if created else getattr(instance, '_audit_before', None),
        after_json=_serialize(instance),
    )


@receiver(post_delete)
def _log_post_delete(sender, instance, **kwargs):
    if not _is_audited(instance):
        return
    from .models import ChangeLog

    ChangeLog.objects.create(
        user=get_audit_user(),
        entity=_resolve_entity(instance),
        app_label=sender._meta.app_label,
        model=sender._meta.model_name,
        object_id=str(instance.pk),
        action=ChangeLog.Action.DELETE,
        before_json=_serialize(instance),
        after_json=None,
    )
