# Sprint 5 — Gobierno del Estudio Técnico

**Objetivo:** Implementar el gobierno del proceso de reestructuración: máquina de estados con transiciones precondicionadas, módulo de consultas oficiales a organismos externos, y módulo de participación y Comisión de Personal.

---

## Bloques implementados

### 5.1 — Máquina de estados del Restructuring

#### Estados (12)

| Valor DB | Etiqueta |
|---|---|
| `BORRADOR` | Borrador |
| `DIAGNOSTICO_COMPLETO` | Diagnóstico completo |
| `ANALISIS_COMPLETO` | Análisis completo |
| `REVISION_JURIDICA` | Revisión jurídica |
| `REVISION_FINANCIERA` | Revisión financiera |
| `CONCEPTO_DAFP_SOLICITADO` | Concepto DAFP solicitado |
| `CONCEPTO_DAFP_RECIBIDO` | Concepto DAFP recibido |
| `COMISION_PERSONAL_INFORMADA` | Comisión de personal informada |
| `APROBADO` | Aprobada |
| `ACTO_EXPEDIDO` | Acto expedido |
| `IMPLEMENTADO` | Implementada |
| `ARCHIVADO` | Archivada |

Migración reversible en 3 pasos: ampliación con valores legacy + nuevos → backfill RunPython → AlterField final.

**Mapeo legacy → nuevo:**
- `DRAFT` → `BORRADOR`
- `IN_PROGRESS` → `ANALISIS_COMPLETO`
- `APPROVED` → `APROBADO`
- `IMPLEMENTED` → `IMPLEMENTADO`
- `ARCHIVED` → `ARCHIVADO`

Campo nuevo: `current_status_since = DateTimeField(null=True, blank=True)`.

#### Transiciones (11)

| De | A | Grupo | Precondiciones |
|---|---|---|---|
| BORRADOR | DIAGNOSTICO_COMPLETO | Planeación | Diagnóstico con ítems DOFA |
| DIAGNOSTICO_COMPLETO | ANALISIS_COMPLETO | Equipo Técnico | Planta propuesta + Matriz de cargas |
| ANALISIS_COMPLETO | REVISION_JURIDICA | Jurídica | 0 errores de validación |
| REVISION_JURIDICA | REVISION_FINANCIERA | Financiera | MFMP creado para la entidad |
| REVISION_FINANCIERA | CONCEPTO_DAFP_SOLICITADO | Planeación | Consulta DAFP creada |
| CONCEPTO_DAFP_SOLICITADO | CONCEPTO_DAFP_RECIBIDO | Planeación | Consulta DAFP con response_at |
| CONCEPTO_DAFP_RECIBIDO | COMISION_PERSONAL_INFORMADA | Talento Humano | CommitteeMeeting vinculada |
| COMISION_PERSONAL_INFORMADA | APROBADO | Administrador | 0 errores + DAFP FAVORABLE |
| APROBADO | ACTO_EXPEDIDO | Jurídica | ActDraft ISSUED + DAFP FAVORABLE |
| ACTO_EXPEDIDO | IMPLEMENTADO | Planeación | Sin precondiciones |
| IMPLEMENTADO | ARCHIVADO | Administrador | Sin precondiciones |

**Archivos:**
- `apps/core/models.py` — Status ampliado, campo `current_status_since`
- `apps/core/migrations/0007_restructuring_new_statuses.py` — Migración 3-paso reversible
- `apps/core/workflow.py` — Definición de `Transition`, `TRANSITIONS`, precondiciones
- `apps/core/services/__init__.py`
- `apps/core/services/workflow.py` — `get_available_transitions`, `execute_transition`
- `apps/core/views.py` — Acciones `transiciones` y `transicionar` en `RestructuringViewSet`
- `apps/core/tests_workflow.py` — 13 tests

---

### 5.2 — Consultas obligatorias (`apps.consultas`)

**Modelo `OfficialConsultation(AuditedModel)`:**
- FK a `core.Restructuring`
- `entity_target`: DAFP, MINHACIENDA, MINTRABAJO, CNSC, CONTRALORIA, PERSONERIA, OTRO
- `subject`, `sent_at`, `reference_number`, `response_at`
- `response_result`: PENDIENTE / FAVORABLE / NO_FAVORABLE / CON_OBSERVACIONES
- FK opcional a `documentos.Document` (respuesta)
- `notes`
- Servicio: `days_until_expiration(consultation) → int | None` (30 días naturales)

**Archivos:**
- `apps/consultas/models.py`, `apps.py`, `serializers.py`, `views.py`, `urls.py`
- `apps/consultas/migrations/0001_initial.py`, `0002_rename_idx.py`
- `apps/consultas/tests.py` — 9 tests

---

### 5.3 — Participación y Comisión de Personal (`apps.participacion`)

**Modelos:**

- `PersonnelCommittee(AuditedModel)`:
  - FK a `core.Entity`
  - `name`, `members_json` (lista `{name, role, since}`)
  - `unique_together = [('entity', 'name')]`

- `CommitteeMeeting(AuditedModel)`:
  - FK a `PersonnelCommittee`, FK opcional a `core.Restructuring`
  - `date`, `agenda`, `minutes_text`, FK opcional a `documentos.Document`
  - Índices en `(committee, date)` y `(restructuring)`

- `UnionCommunication(AuditedModel)`:
  - FK a `core.Restructuring`
  - `union_name`, `sent_at`, `subject`, `body`
  - FK opcional a `documentos.Document`
  - `response_received`, `response_notes`

**Archivos:**
- `apps/participacion/models.py`, `apps.py`, `serializers.py`, `views.py`, `urls.py`
- `apps/participacion/migrations/0001_initial.py`, `0002_rename_idx.py`
- `apps/participacion/tests.py` — 11 tests

---

## Migraciones

| Migración | Descripción |
|---|---|
| `core.0007_restructuring_new_statuses` | 12 estados nuevos + backfill + `current_status_since` |
| `consultas.0001_initial` | Modelo OfficialConsultation |
| `consultas.0002_rename_idx` | Renombrado de índice por convención Django |
| `participacion.0001_initial` | PersonnelCommittee, CommitteeMeeting, UnionCommunication |
| `participacion.0002_rename_idx` | Renombrado de índices por convención Django |

---

## Endpoints nuevos

| Ruta | Método | Descripción |
|---|---|---|
| `/api/reestructuraciones/<id>/transiciones/` | GET | Transiciones disponibles desde el estado actual |
| `/api/reestructuraciones/<id>/transicionar/` | POST | Ejecutar transición `{to_status}` |
| `/api/consultas/` | GET/POST | CRUD consultas oficiales |
| `/api/consultas/<id>/` | GET/PATCH/DELETE | Detalle / actualizar respuesta |
| `/api/comision-personal/` | GET/POST | CRUD comisiones de personal |
| `/api/comision-personal/<id>/` | GET/PATCH/DELETE | Detalle comisión |
| `/api/comision-reuniones/` | GET/POST | CRUD reuniones (filtrable por committee y restructuring) |
| `/api/comision-reuniones/<id>/` | GET/PATCH/DELETE | Detalle reunión |
| `/api/comunicaciones-sindicales/` | GET/POST | CRUD comunicaciones sindicales |
| `/api/comunicaciones-sindicales/<id>/` | GET/PATCH/DELETE | Detalle comunicación |

---

## Frontend

| Archivo | Descripción |
|---|---|
| `src/app/reestructuraciones/[id]/gobierno/page.tsx` | Barra de 12 estados + transiciones con botones y tooltip de bloqueo |
| `src/app/consultas/page.tsx` | CRUD consultas, coloreado por días de expiración, modal de respuesta |
| `src/app/comision-personal/page.tsx` | Lista de comisiones, editor de reuniones en acordeón |
| `src/components/layout/Sidebar.tsx` | Sección "Gobierno" con Gobierno (Workflow), Consultas (Mail), Comisión Personal (Users) |
| `src/types/index.ts` | `RestructuringStatus` (12 valores), `WorkflowTransition`, `OfficialConsultation`, `ConsultationTarget`, `ConsultationResult`, `PersonnelCommittee`, `CommitteeMeeting`, `UnionCommunication`, `current_status_since` en `Restructuring` |

---

## Tests

**Total: 139 tests — 100% OK**

| Módulo | Tests nuevos |
|---|---|
| `apps.core.tests_workflow` | 13 |
| `apps.consultas` | 9 |
| `apps.participacion` | 11 |
| Anteriores (heredados) | 106 |

**Tests de Sprint 5 cubiertos:**
- `test_borrador_a_diagnostico_completo_requiere_dofa`: sin Diagnosis → bloqueo; con DOFA → pasa.
- `test_no_aprobado_si_errors_validacion`: R-014 (sin objetivo) bloquea la transición a APROBADO.
- `test_acto_expedido_exige_dafp_favorable`: sin consulta → bloqueo; con FAVORABLE → pasa.
- `test_transicion_registra_changelog`: ChangeLog escrito vía signal al cambiar estado.
- `test_non_superuser_sin_grupo_no_puede_transicionar`: 403 cuando el grupo no coincide.

---

## Puertas de calidad

| Puerta | Resultado |
|---|---|
| `makemigrations` | No changes detected |
| `migrate` | 5 migraciones aplicadas |
| `makemigrations --dry-run` | No changes detected |
| `check` | 0 issues |
| Test suite 139 tests | 139/139 OK |
| `npm run typecheck` | Sin errores |
| `seed_permissions --force` | 416 celdas (52 modelos × 8 grupos) |
| `loaddata seed_jota.json` | 81 objetos (5 intents nuevos pks 76–80) |

---

## Fixture Jota

Añadidos 5 intents (pks 76–80):
- `maquina-estados` (pk 76)
- `transiciones-workflow` (pk 77)
- `consulta-dafp` (pk 78)
- `comision-personal` (pk 79)
- `comunicaciones-sindicales` (pk 80)

---

## Decisiones técnicas

- **Migración reversible en 3 pasos**: se incluye el set combinado (legacy + nuevos) en el paso intermedio para evitar errores de integridad durante el backfill.
- **Precondiciones como funciones**: cada precondición retorna `list[str]` (razones de bloqueo) en lugar de booleano, permitiendo mensajes descriptivos en el frontend.
- **ChangeLog automático**: el `execute_transition` solo guarda el modelo; el signal pre_save/post_save de `apps.common` registra el cambio en ChangeLog sin código adicional porque `core.Restructuring` está en `AUDIT_MODELS`.
- **Verificación de grupo vs superuser**: el endpoint `transicionar` comprueba el grupo solo para usuarios normales; el superuser puede siempre (excepto precondiciones fallidas).
- **days_until_expiration determinista**: simplificado a 30 días naturales para DAFP y todos los organismos; retorna `None` si no hay `sent_at` o si ya hay `response_at`.
- **CommitteeMeeting sin scoped mixin**: el ViewSet permite filtrar por `committee` o `restructuring` vía query params, evitando el problema de FK doble en `RestructuringScopedMixin`.

---

## Pendientes conocidos

- **Notificaciones de transición**: el campo `notifications` en `execute_transition` retorna lista vacía. Sprint 6 implementa notificaciones push/email.
- **Editor de miembros de comisión**: el `members_json` es editable solo vía API (PATCH). Una UI de editor inline es candidata al Sprint 6.
- **Historial de transiciones en el frontend**: la página de gobierno podría mostrar el ChangeLog filtrado por `model=restructuring`. Se dejó como pendiente para el Sprint 6 (dashboard).
- **Comunicaciones sindicales**: el módulo está implementado en backend y frontend de comisión-personal, pero no tiene página standalone separada para mayor visibilidad.
- **Validación de grupo personalizada**: actualmente compara el nombre del grupo (string). Una mejora sería un sistema más robusto de permisos basado en la matriz.
