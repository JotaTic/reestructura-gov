"""
Inicializa la matriz `core.GroupModelPermission` con los permisos por defecto
de cada grupo (Planeación, Talento Humano, Jurídica, etc.).

Idempotente: crea/actualiza celdas sin borrar otras que ya existan (a menos que
se pase `--force`, en cuyo caso limpia primero la matriz entera).

La política por defecto:
- Administrador y Equipo Técnico: CRUD en todos los modelos.
- Consulta: solo Read en todo.
- Secretaría General: solo Read en todo.
- Planeación: CRUD en diagnostico/procesos/cargas/core.* (restructuring,
  department, timeline). Read en el resto.
- Talento Humano: CRUD en planta/reten/cargas. Read en el resto.
- Jurídica: CRUD en actos/legal. Read en el resto.
- Financiera: CRUD en financiero. Read en el resto.
- auth.User / auth.Group: solo admin (Administrador).
- common.ChangeLog: solo admin.

Los modelos del módulo de Superadministración (UserEntityAccess,
GroupModelPermission) no se cargan en la matriz porque sus endpoints ya exigen
`is_superuser=True` directamente.
"""
from __future__ import annotations

from django.apps import apps as django_apps
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core.models import GroupModelPermission
from apps.common.permissions import invalidate_matrix_cache


# Grupos que no aparecen en la matriz (los editan superusers).
EXCLUDED_APPS_FOR_MATRIX = {'admin', 'contenttypes', 'sessions'}
EXCLUDED_MODELS = {
    ('core', 'userentityaccess'),
    ('core', 'groupmodelpermission'),
    ('common', 'changelog'),
    ('auth', 'permission'),
}

# Apps con su responsable primario (CRUD) y el resto quedan en R.
APP_OWNERS = {
    'diagnostico': ['Planeación', 'Equipo Técnico'],
    'procesos': ['Planeación', 'Equipo Técnico'],
    'cargas': ['Planeación', 'Talento Humano', 'Equipo Técnico'],
    'planta': ['Talento Humano', 'Equipo Técnico'],
    'reten': ['Talento Humano', 'Equipo Técnico'],
    'actos': ['Jurídica', 'Equipo Técnico'],
    'legal': ['Jurídica', 'Equipo Técnico'],
    'financiero': ['Financiera', 'Equipo Técnico'],
    'nomenclatura': ['Equipo Técnico'],
    'jota': ['Equipo Técnico'],
    'core': ['Planeación', 'Equipo Técnico', 'Talento Humano'],
}

ALL_CRUD_GROUPS = {'Administrador'}   # además superuser, pero para no-super del mismo grupo
READ_ONLY_GROUPS = {'Consulta', 'Secretaría General'}


class Command(BaseCommand):
    help = 'Inicializa la matriz de permisos CRUD por grupo × modelo.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true',
                            help='Elimina todas las filas antes de re-insertar.')

    def handle(self, *args, **opts):
        groups = {g.name: g for g in Group.objects.all()}
        if not groups:
            self.stdout.write(self.style.WARNING(
                'No hay grupos. Ejecuta primero `manage.py seed_users`.'
            ))
            return

        models = self._collect_models()
        count = 0
        with transaction.atomic():
            if opts['force']:
                GroupModelPermission.objects.all().delete()
            for (app_label, model_name) in models:
                for gname, group in groups.items():
                    perms = self._policy(gname, app_label)
                    GroupModelPermission.objects.update_or_create(
                        group=group, app_label=app_label, model=model_name,
                        defaults=perms,
                    )
                    count += 1
        invalidate_matrix_cache()
        self.stdout.write(self.style.SUCCESS(
            f'Matriz de permisos lista ({count} celdas, {len(models)} modelos × {len(groups)} grupos).'
        ))

    def _collect_models(self) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        for cfg in django_apps.get_app_configs():
            if cfg.label in EXCLUDED_APPS_FOR_MATRIX:
                continue
            for model in cfg.get_models():
                key = (cfg.label, model._meta.model_name)
                if key in EXCLUDED_MODELS:
                    continue
                out.append(key)
        # auth.User y auth.Group los añadimos manualmente como editables por Administrador.
        out.append(('auth', 'user'))
        out.append(('auth', 'group'))
        return sorted(set(out))

    def _policy(self, group_name: str, app_label: str) -> dict:
        if group_name in ALL_CRUD_GROUPS:
            return {'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True}
        if group_name in READ_ONLY_GROUPS:
            return {'can_create': False, 'can_read': True, 'can_update': False, 'can_delete': False}
        owners = APP_OWNERS.get(app_label, [])
        if group_name in owners:
            return {'can_create': True, 'can_read': True, 'can_update': True, 'can_delete': True}
        # Por defecto: lectura en el resto de apps (tenant multi-rol colabora).
        return {'can_create': False, 'can_read': True, 'can_update': False, 'can_delete': False}
