"""
Serializers del módulo de Superadministración (Sprint 0).
"""
from __future__ import annotations

import secrets
import string

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from rest_framework import serializers

from apps.common.models import ChangeLog
from .models import Entity, GroupModelPermission, UserEntityAccess

User = get_user_model()


# ------------------------- Users ------------------------------------------


class UserEntityAccessInlineSerializer(serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = UserEntityAccess
        fields = ['id', 'entity', 'entity_name', 'is_default']


class AdminUserSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Group.objects.all(), required=False,
    )
    group_names = serializers.SerializerMethodField()
    entity_access = UserEntityAccessInlineSerializer(many=True, read_only=True)
    allowed_entity_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
    )
    default_entity_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    temporary_password = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser',
            'groups', 'group_names',
            'entity_access', 'allowed_entity_ids', 'default_entity_id',
            'temporary_password',
        ]
        read_only_fields = ['is_superuser']

    def get_group_names(self, obj) -> list[str]:
        return list(obj.groups.values_list('name', flat=True))

    def _sync_entities(self, user, allowed_ids, default_id):
        allowed_ids = list(dict.fromkeys(allowed_ids or []))
        if default_id is not None and default_id not in allowed_ids:
            raise serializers.ValidationError(
                {'default_entity_id': 'La entidad por defecto debe estar entre las permitidas.'}
            )
        existing = {a.entity_id: a for a in user.entity_access.all()}
        with transaction.atomic():
            # Crea/actualiza
            for eid in allowed_ids:
                access = existing.get(eid)
                is_default = (eid == default_id)
                if access is None:
                    UserEntityAccess.objects.create(
                        user=user, entity_id=eid, is_default=is_default
                    )
                elif access.is_default != is_default:
                    access.is_default = is_default
                    access.save(update_fields=['is_default'])
            # Elimina los que ya no están
            for eid, access in existing.items():
                if eid not in allowed_ids:
                    access.delete()

    @staticmethod
    def _generate_temp_password() -> str:
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(14))

    def create(self, validated_data):
        groups = validated_data.pop('groups', [])
        allowed_ids = validated_data.pop('allowed_entity_ids', [])
        default_id = validated_data.pop('default_entity_id', None)
        temp = self._generate_temp_password()
        user = User(**validated_data)
        user.set_password(temp)
        user.save()
        user.groups.set(groups)
        self._sync_entities(user, allowed_ids, default_id)
        user.temporary_password = temp  # atributo en memoria para la respuesta
        return user

    def update(self, instance, validated_data):
        groups = validated_data.pop('groups', None)
        allowed_ids = validated_data.pop('allowed_entity_ids', None)
        default_id = validated_data.pop('default_entity_id', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        if allowed_ids is not None:
            self._sync_entities(instance, allowed_ids, default_id)
        return instance


# ------------------------- Groups -----------------------------------------


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


# ------------------------- Permission matrix ------------------------------


class GroupModelPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupModelPermission
        fields = [
            'id', 'group', 'app_label', 'model',
            'can_create', 'can_read', 'can_update', 'can_delete',
            'updated_at',
        ]


# ------------------------- Audit ------------------------------------------


class ChangeLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default=None)
    entity_name = serializers.CharField(source='entity.name', read_only=True, default=None)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ChangeLog
        fields = [
            'id', 'user', 'user_username', 'entity', 'entity_name',
            'app_label', 'model', 'object_id',
            'action', 'action_display', 'before_json', 'after_json', 'at',
        ]
