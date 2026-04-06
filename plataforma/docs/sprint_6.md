# Sprint 6 — Experiencia (Simulador + Dashboard + Notificaciones)

**Objetivo:** Implementar las capas de experiencia de usuario: simulador de escenarios de reestructuración, dashboard ejecutivo con KPIs y módulo de notificaciones por usuario.

---

## Bloques implementados

### 6.1 — Simulador de escenarios (`apps.simulador`)

#### Modelo `Scenario(AuditedModel)`

| Campo | Tipo | Descripción |
|---|---|---|
| `restructuring` | FK core.Restructuring | Expediente al que pertenece |
| `name` | CharField(255) | Nombre único por restructuring |
| `description` | TextField | Descripción opcional |
| `parent` | FK('self', null=True) | Escenario padre (clonación) |
| `is_baseline` | BooleanField | Solo uno por restructuring |
| `payroll_plan` | FK planta.PayrollPlan | Plan que representa este escenario |
| `cached_metrics` | JSONField | Resultado del último evaluate_scenario |

**Constraints:**
- `unique_together`: `(restructuring, name)`
- `UniqueConstraint`: un solo `is_baseline=True` por restructuring
- `Index`: campo `restructuring`

#### Servicios (`apps/simulador/services.py`)

- `clone_plan_to_scenario(plan, restructuring, scenario_name)`: clona PayrollPlan + PayrollPositions, crea Scenario.
- `evaluate_scenario(scenario)`: calcula métricas (posiciones, costos, Ley 617, mandatos, elegibilidad), guarda en `cached_metrics`.
- `compare_scenarios(scenarios)`: tabla N-aria con rankings por costo, cumplimiento Ley 617 y posiciones.

#### Endpoints

| Ruta | Método | Descripción |
|---|---|---|
| `/api/simulador/` | GET/POST | CRUD de escenarios (filtrado por X-Restructuring-Id) |
| `/api/simulador/<id>/` | GET/PATCH/DELETE | Detalle de escenario |
| `/api/simulador/<id>/evaluar/` | POST | Calcular y cachear métricas |
| `/api/simulador/clonar/` | POST | Clonar plan a escenario `{plan_id, name}` |
| `/api/simulador/comparar/` | POST | Comparar N escenarios `{scenario_ids: [...]}` |

---

### 6.2 — Dashboard ejecutivo (`apps.core.views_dashboard`)

#### Endpoint `GET /api/dashboard/?entity=<id>`

Sin parámetro `entity`: agrega todas las entidades del usuario.
Con parámetro `entity`: añade `per_restructuring` con detalle.

**Respuesta:**
```json
{
  "restructurings": [{id, name, status, status_display, days_in_status, entity_name, objectives_count}],
  "summary": {
    "total_restructurings": N,
    "by_status": {"BORRADOR": 2, ...},
    "total_employees": N,
    "total_protected": N,
    "total_positions_current": N,
    "total_positions_proposed": N,
    "validation_errors": N,
    "validation_warnings": N,
    "upcoming_consultations": [...]
  },
  "per_restructuring": [
    {
      "restructuring_id": N,
      "modules_complete_pct": 62.5,
      "validation": {"errors": 0, "warnings": 2, "info": 1},
      "cost_current": 150000000.0,
      "cost_proposed": 140000000.0,
      "cost_delta": -10000000.0,
      "law_617_current": true,
      "law_617_projected": true,
      "positions_delta": -3,
      "protected_count": 4
    }
  ]
}
```

**Archivos:**
- `apps/core/views_dashboard.py` — lógica del dashboard
- `apps/core/urls_dashboard.py` — ruta `api/dashboard/`
- `config/urls.py` — inclusión de `apps.core.urls_dashboard`

---

### 6.3 — Notificaciones (`apps.notificaciones`)

#### Modelo `Notification(AuditedModel)`

| Campo | Tipo | Descripción |
|---|---|---|
| `user` | FK AUTH_USER | Usuario destinatario |
| `kind` | CharField(24) | TRANSITION / VALIDATION_ERROR / CONSULTATION_DUE / DOCUMENT_NEW / ASSIGNMENT / SYSTEM |
| `entity` | FK core.Entity (null) | Contexto de entidad |
| `restructuring` | FK core.Restructuring (null) | Contexto de reestructuración |
| `message` | CharField(500) | Texto de la notificación |
| `link` | CharField(255) | Ruta frontend |
| `read` | BooleanField | Estado de lectura |

**Índices:** `(user, -created_at)`, `(user, read)`. **Ordering:** `-created_at`.

#### Servicios (`apps/notificaciones/services.py`)

- `notify(user, kind, message, link, entity, restructuring)`: crea Notification + intenta enviar email (fail_silently).
- `notify_group(group_name, kind, message, link, entity, restructuring)`: notifica a todos los usuarios activos del grupo.
- `mark_read(user, notification_ids=None)`: marca leídas (todas o por ids).

#### Integración con workflow

En `apps/core/services/workflow.py::execute_transition`, al final llama `notify_group` al grupo responsable de la transición.

#### Endpoints

| Ruta | Método | Descripción |
|---|---|---|
| `/api/notificaciones/` | GET | Lista de notificaciones del usuario (paginada) |
| `/api/notificaciones/<id>/` | GET | Detalle |
| `/api/notificaciones/sin-leer/` | GET | `{unread_count: N}` |
| `/api/notificaciones/marcar-leidas/` | POST | `{ids: [...]}` o `{}` para todas |

---

## Migraciones

| Migración | Descripción |
|---|---|
| `notificaciones.0001_initial` | Modelo Notification |
| `simulador.0001_initial` | Modelo Scenario con constraints |

---

## Frontend

| Archivo | Descripción |
|---|---|
| `src/app/dashboard/page.tsx` | Dashboard ejecutivo con KPIs, tabla de reestructuraciones, consultas próximas a vencer y detalle per_restructuring |
| `src/app/simulador/page.tsx` | Simulador: lista de escenarios, clonar plan, evaluar métricas, comparar N escenarios con rankings |
| `src/components/layout/Topbar.tsx` | Campana Bell con badge de no leídas, dropdown de últimas 10, auto-refresh 30s, marcar leídas |
| `src/components/layout/Sidebar.tsx` | Items "Dashboard" y "Simulador" (GitCompare, badge M22) en sección "Analítico" |
| `src/types/index.ts` | Notification, NotificationKind, Scenario, ScenarioMetrics, ScenarioComparison, ScenarioRanking, DashboardSummary, DashboardRestructuringItem, DashboardRestructuringDetail, DashboardResponse |

---

## Tests

**Total del proyecto: 158/158 OK**

| Módulo | Tests nuevos | Descripción |
|---|---|---|
| `apps.simulador.tests` | 8 | clone_plan_to_scenario, evaluate_scenario, compare_scenarios, constraints del modelo |
| `apps.notificaciones.tests` | 6 | notify, notify_group, mark_read, transition dispara notificación |
| `apps.core.tests_dashboard` | 6 | summary, filter by entity, per_restructuring, no per_restructuring sin entity, autenticación, non-superuser |

---

## Fixture Jota

Añadidos 5 intents (pks 81–85):
- `simulador-escenarios` (pk 81)
- `dashboard-ejecutivo` (pk 82)
- `notificaciones-plataforma` (pk 83)
- `comparar-escenarios` (pk 84)
- `consultas-vencer` (pk 85)

Total: 86 objetos en `seed_jota.json`.

---

## Puertas de calidad

| Puerta | Resultado |
|---|---|
| `makemigrations` | No changes detected |
| `migrate` | 2 migraciones aplicadas |
| `makemigrations --dry-run` | No changes detected |
| `check` | 0 issues |
| Test suite 158 tests | 158/158 OK |
| `npm run typecheck` | Sin errores |
| `seed_permissions --force` | 432 celdas (54 modelos × 8 grupos) |
| `loaddata seed_jota.json` | 86 objetos |

---

## Decisiones técnicas

- **Simulador sin estado mutable en DB**: `evaluate_scenario` escribe en `cached_metrics` del Scenario, no en tablas separadas. Mantiene la arquitectura liviana y facilita la invalidación manual.
- **Dashboard eficiente**: queries agrupadas vía agregaciones Django (`Sum`, `Count`). Para dev con pocos datos no hay problema; en producción se puede añadir caché.
- **Notificaciones read-only por API**: el ViewSet hereda `ReadOnlyModelViewSet` — las notificaciones solo se crean por servicios (nunca por POST externo), evitando spam.
- **Bell auto-refresh**: `setInterval(30s)` en Topbar; se limpia con `clearEffect` al desmontar el componente.
- **Email fail_silently**: el envío de email no interrumpe el flujo en ningún caso.
- **notify_group sin grupos vacíos**: si el grupo no existe, retorna lista vacía sin lanzar excepción.
- **Integración workflow no bloqueante**: el `try/except` alrededor de `notify_group` en `execute_transition` garantiza que un fallo en notificaciones no revierta la transición.

---

## Pendientes conocidos

- **Notificaciones push/WebSocket**: actualmente solo polling (30s). Una mejora futura podría usar Django Channels o SSE para push real.
- **CONSULTATION_DUE automático**: el trigger via signal de `post_save` de `OfficialConsultation` no está implementado; se haría en un signal en `apps/consultas/signals.py`.
- **DOCUMENT_NEW automático**: similar al anterior para `documentos.Document`.
- **Paginación del dashboard**: si hay muchas entidades, la query podría ser lenta. Candidato a paginación o caching.
- **Editor de escenarios en frontend**: la página del simulador lista escenarios y permite clonar/evaluar/comparar, pero no tiene un editor inline de posiciones (se editaría via `/planta`).
