# Sprint 0 — Fundaciones

**Objetivo:** que cada usuario vea solo las entidades que tiene asignadas y que
los permisos CRUD se administren desde una única pantalla del superadmin.
Sin esto, nada del resto es seguro.

## Cambios introducidos

### Modelos nuevos

| Modelo | Ubicación | Propósito |
|---|---|---|
| `core.UserEntityAccess(user, entity, is_default)` | `apps/core/models.py` | Acceso multi-tenant: qué entidades ve cada usuario. Constraint `unique(user, entity)` + `unique(user) where is_default=True`. |
| `core.GroupModelPermission(group, app_label, model, C, R, U, D)` | `apps/core/models.py` | Matriz CRUD por grupo × modelo. `unique(group, app_label, model)`. |
| `common.ChangeLog(user, entity, app_label, model, object_id, action, before_json, after_json, at)` | `apps/common/models.py` | Historial de cambios automático vía signals. |

### Utilidades transversales

- `apps/common/audit.py`
  - `AuditedModel`: mixin abstracto con `created_at/by`, `updated_at/by`. Lo
    heredarán los modelos transaccionales de futuros sprints.
  - `AuditedSerializerMixin`: setea `created_by/updated_by` desde `request.user`.
  - `AUDIT_MODELS` (set) + `register_audit_model(label)` para marcar un modelo
    como auditado.
- `apps/common/signals.py`: `pre_save/post_save/post_delete` escriben
  `ChangeLog` para los modelos registrados en `AUDIT_MODELS`.
- `apps/common/middleware.py`: `AuditUserMiddleware` propaga `request.user` al
  thread-local de los signals.
- `apps/common/permissions.py`: `MatrixPermission` — permission class DRF que
  resuelve (método × modelo × grupos) contra `GroupModelPermission` con caché
  de 60 s. Superuser siempre pasa; endpoints sin modelo resoluble pasan
  (solo siguen exigiendo `IsAuthenticated`).
- `apps/common/mixins.py`: `EntityScopedMixin.get_active_entity_id()` ahora
  valida que la `X-Entity-Id` esté dentro del set del usuario y rechaza con
  `403 entity_not_authorized`.

### Registro global

- `config/settings.py`
  - `MIDDLEWARE` añade `apps.common.middleware.AuditUserMiddleware`.
  - `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES` añade `MatrixPermission` junto
    a `IsAuthenticated`.
- `apps/common/apps.py ready()` conecta signals y registra los modelos
  iniciales auditados: `core.Entity`, `core.Restructuring`, `core.Department`,
  `core.UserEntityAccess`, `core.GroupModelPermission`, `auth.User`.

### Endpoints nuevos

Todos bajo `/api/superadmin/` y protegidos con `IsSuperUser`:

| Ruta | Verbo | Descripción |
|---|---|---|
| `/superadmin/users/` | GET/POST | Listar/crear usuarios (entrega `temporary_password` al crear). |
| `/superadmin/users/{id}/` | GET/PATCH/DELETE | CRUD unitario. |
| `/superadmin/users/{id}/reset-password/` | POST | Genera nueva password temporal. |
| `/superadmin/groups/` | GET | Listado de grupos (read-only). |
| `/superadmin/permissions/matrix/` | GET | Matriz completa `groups × models` con sus celdas C/R/U/D. |
| `/superadmin/permissions/bulk-save/` | POST | Guarda una fila completa (un modelo × todos los grupos). |
| `/superadmin/permissions/reset-defaults/` | POST | Re-ejecuta `seed_permissions --force`. |
| `/superadmin/audit/` | GET | Historial `ChangeLog` filtrable por `app_label`, `model`, `action`, `user`, `entity`. |

**`GET /api/me/context/`**: ahora devuelve solo las entidades permitidas al
usuario y el campo `default_entity_id`. Para superusuario devuelve todas con
`default_entity_id=null`.

### Management commands

- `seed_permissions` (nuevo): inicializa/repuebla la matriz según política por
  grupo × app. Flag `--force` limpia antes.
- `seed_users` (reescrito): crea grupos + usuarios + accesos por entidad y al
  final invoca `seed_permissions`. Crea el usuario de prueba aislado
  `tenant_test / tenant123` con acceso solo a la primera entidad.

### Frontend

- `src/app/superadmin/layout.tsx`: guard que redirige a `/` si el usuario no
  es `is_superuser`.
- `src/app/superadmin/page.tsx`: landing con tarjetas (Usuarios, Permisos,
  Auditoría, Jota próximamente).
- `src/app/superadmin/users/page.tsx`: CRUD de usuarios con asignación de
  grupos, entidades permitidas y entidad default, acciones de reset password.
- `src/app/superadmin/permissions/page.tsx`: matriz editable colapsable por
  app; guardado por fila con indicador de filas sucias; botón *Restablecer*.
- `src/app/superadmin/audit/page.tsx`: listado del ChangeLog con filtros y
  diff `before / after` en modal.
- `src/components/layout/Sidebar.tsx`: ítem *Superadmin* visible solo cuando
  `user.is_superuser`.
- `src/components/layout/Topbar.tsx`: selector de entidad deshabilitado
  (sin chevron) cuando el usuario tiene una sola entidad.
- `src/components/layout/AppShell.tsx`: auto-selección de entidad default o
  única al iniciar sesión.
- `src/types/index.ts`: añadidos `AdminUser`, `AdminGroup`, `MatrixRow`,
  `MatrixResponse`, `ChangeLogEntry`, `AdminUserEntityAccess`.

### Fixture Jota

Añadidos intents (slugs): `matriz-permisos`, `gestionar-usuarios`,
`auditoria`, `cambiar-entidad-multi`.

## Cómo probarlo

```bash
cd plataforma/backend
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_users          # crea grupos, usuarios, accesos y matriz
.venv\Scripts\python manage.py loaddata apps/jota/fixtures/seed_jota.json
.venv\Scripts\python manage.py runserver
```

En otro terminal:

```bash
cd plataforma/frontend
npm run dev
```

Usuarios de prueba:

- `admin / admin123` — superuser, ve todo incluido `/superadmin/`.
- `planeacion / planeacion123` — grupo Planeación, CRUD en diagnóstico,
  procesos, cargas, core.
- `consulta / consulta123` — read-only global.
- `tenant_test / tenant123` — acceso solo a la primera entidad. Útil para
  verificar aislamiento: si intenta forzar `X-Entity-Id` de otra entidad, el
  backend responde 403 `entity_not_authorized`.

## Puertas de calidad (ejecutadas)

- `python manage.py makemigrations --dry-run` → *No changes detected* ✅
- `python manage.py check` → *0 issues* ✅
- `python manage.py test apps.core.tests_sprint0` → **15/15 OK** ✅
- Coverage de servicios del sprint:
  - `common.permissions`: 74%
  - `common.signals`: 91%
  - `common.audit`: 97%
  - `common.middleware`: 100%
  - `common.models`: 100%
  - `core.management.seed_permissions`: 98%
  - `core.views_admin`: 89%
  - `core.serializers_admin`: 81%
- `npm run typecheck` → sin errores ✅
- Smoke E2E (Django test client): login planeación y tenant_test, verificación
  de aislamiento + denegación de consulta + acceso del superadmin a
  `/superadmin/*` ✅

## Tests incluidos

`apps/core/tests_sprint0.py`:

- `TenantIsolationTests`
  - `test_user_only_sees_allowed_entities_in_context`
  - `test_superuser_sees_all_entities`
  - `test_cross_entity_access_denied` → 403 `entity_not_authorized`
  - `test_consulta_group_cannot_write`
  - `test_planeacion_can_create_restructuring`
- `SuperadminEndpointTests`
  - `test_non_super_blocked_from_superadmin`
  - `test_super_can_list_users_and_matrix`
  - `test_super_can_create_user_with_entities`
  - `test_reset_password_generates_temp`
  - `test_bulk_save_updates_matrix`
- `HelperUnitTests`
  - `test_get_user_allowed_entity_ids`
  - `test_register_audit_model`
  - `test_audited_serializer_mixin_injects_user`
- `ChangeLogSignalTests`
  - `test_creating_entity_writes_changelog`
  - `test_updating_entity_writes_update_log`

## Pendientes conocidos

- **Password change on first login**: `AdminUserSerializer` entrega una
  contraseña temporal al crear, pero aún no existe un flag
  `password_change_required` ni un flujo en `/login` que fuerce el cambio.
  Queda pendiente para un sub-sprint corto: añadir campo booleano al modelo
  `User` (o perfil), middleware que redirija al formulario de cambio, y
  endpoint `POST /api/auth/change-password/`.
- **`invalidate_matrix_cache`**: en dev usa `LocMemCache` que no soporta
  `delete_pattern`. Como fallback llama a `cache.clear()`, aceptable en dev.
  Para producción (Redis), el patrón funcionará nativamente.
- **`AuditedModel` todavía no heredado**: los modelos existentes no se migran
  a `AuditedModel` en este sprint para no reescribir migraciones de todos los
  apps. Los nuevos modelos de sprints siguientes sí deberán heredarlo.
- **Matrix vs seed count**: la UI enumera 27 modelos (incluye `auth.user` y
  `auth.group` manualmente) mientras que `seed_permissions` siembra 25 celdas
  base. La discrepancia es intencional: los 2 extra se crean al primer
  `bulk-save` si el superadmin los toca. Alternativamente, alinear ambos
  catálogos en un sub-sprint futuro.
- **Coverage de `common.mixins`**: 57% — el remanente corresponde a
  `RestructuringScopedMixin`, ejercitado por los módulos de diagnóstico,
  procesos, etc., fuera del alcance del Sprint 0.
