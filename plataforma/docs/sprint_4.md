# Sprint 4 — Núcleo Analítico

**Objetivo:** Implementar el motor de elegibilidad, el retén automático, los validadores legales declarativos y el generador consolidado del estudio técnico.

---

## Bloques implementados

### 4.1 — Motor de elegibilidad (`apps.analisis`)

Nueva app sin modelos persistidos (solo services + ViewSet).

**Archivos:**
- `apps/analisis/equivalencias.py` — LEVEL_REQUIREMENTS, EDUCATION_ORDER, EQUIVALENCIAS (D-785/2005).
- `apps/analisis/schemas.py` — dataclass `PromotionEligibility` con `EligibilityStatus`.
- `apps/analisis/services.py` — `analyze_promotion_eligibility`, `bulk_analyze_level`, `estimate_salary_increase_cost`.
- `apps/analisis/views.py` — `EligibilityViewSet` (ViewSet, no ModelViewSet).
- `apps/analisis/urls.py` — router en `/api/analisis/elegibilidad/`.

**Endpoints nuevos:**
| Ruta | Método | Descripción |
|---|---|---|
| `/api/analisis/elegibilidad/analizar-individual/` | POST | Análisis individual: {employee_id, target_level, target_code, target_grade} |
| `/api/analisis/elegibilidad/bulk/` | POST | Análisis masivo: {from_level, to_level} |
| `/api/analisis/elegibilidad/estimar-costo/` | POST | Estimación costo nivelación: {employee_ids, target_level, ...} |

---

### 4.2 — Retén automático (`apps.reten`)

Extensión del módulo existente con detección automática desde hojas de vida.

**Archivos:**
- `apps/reten/services.py` (nuevo) — `detect_pre_pensioned`, `detect_head_of_household`, `detect_disability`, `sync_reten_automatico`.
- `apps/reten/views.py` — añadido `@action sincronizar`.

**Endpoints nuevos:**
| Ruta | Método | Descripción |
|---|---|---|
| `/api/reten-social/sincronizar/` | POST | Detecta y crea/actualiza registros automáticos sin tocar is_manual=True |

**Lógica:** registros con `is_manual=True` nunca se modifican. Los automáticos (`is_manual=False`) se actualizan con evidence del cálculo de pensión.

---

### 4.3 — Validadores legales declarativos (`apps.common`)

Sistema de reglas declarativas con registro global.

**Archivos:**
- `apps/common/validators.py` — `Finding`, `Rule`, `RULES`, `register()`.
- `apps/common/rules/__init__.py` — importa todos los módulos de reglas.
- `apps/common/rules/rules_core.py` — R-010, R-012, R-014, R-015.
- `apps/common/rules/rules_diagnostico.py` — R-013.
- `apps/common/rules/rules_procesos.py` — R-002.
- `apps/common/rules/rules_cargas.py` — R-005, R-011.
- `apps/common/rules/rules_planta.py` — R-003, R-007.
- `apps/common/rules/rules_reten.py` — R-004, R-008.
- `apps/common/rules/rules_mfmp.py` — R-006.
- `apps/common/rules/rules_legal.py` — R-001, R-009.
- `apps/common/views.py` — `validate_restructuring` endpoint.
- `apps/common/urls.py` — ruta `/api/validar/restructuring/<id>/`.

**Reglas implementadas:**

| Código | Nombre | Severidad |
|---|---|---|
| R-001 | Norma citada sin estar en base legal | info |
| R-002 | Proceso sin respuesta a los 3 interrogantes 3.4 | warning |
| R-003 | Cargo propuesto sin actividades en matriz | warning |
| R-004 | Cargo a suprimir sin análisis de retén | warning |
| R-005 | Cargo con carga > 167 h/mes | error |
| R-006 | Planta propuesta rompe Ley 617 | error |
| R-007 | Requisitos de cargo no cumplen D-785/2489 | warning |
| R-008 | Empleado de carrera con cargo suprimido sin plan reincorporación | warning |
| R-009 | Acto sin citar norma habilitante | warning |
| R-010 | Objetivo sin indicador medible | warning |
| R-012 | Ciclo en árbol de dependencias | error |
| R-013 | Diagnóstico sin ítems DOFA | warning |
| R-014 | Reestructuración sin objetivo | error |
| R-015 | Escala salarial desactualizada | warning |

**Endpoint:**
| Ruta | Método | Descripción |
|---|---|---|
| `/api/validar/restructuring/<id>/` | GET | Ejecuta todas las reglas; devuelve {errors, warnings, info, summary} |

---

### 4.4 — Generador consolidado del estudio técnico (`apps.analisis.consolidator`)

**Archivos:**
- `apps/analisis/consolidator.py` — `build_technical_study(restructuring) -> bytes`.
- `apps/core/views.py` — añadido `@action technical_study` en `RestructuringViewSet`.

**Endpoint:**
| Ruta | Método | Descripción |
|---|---|---|
| `/api/reestructuraciones/<id>/estudio-tecnico/` | GET | Descarga DOCX con 12 capítulos + anexos |

**Capítulos generados:**
1. Identificación de la entidad
2. Objetivos de reestructuración
3. Marco legal y mandatos
4. Diagnóstico (DOFA + análisis de entornos)
5. Marco Fiscal de Mediano Plazo
6. Estructura orgánica
7. Matriz de cargas de trabajo
8. Planta de personal (actual vs propuesta)
9. Manual de funciones
10. Retén social
11. Elegibilidad para nivelación (si hay objetivo NIVELACION_SALARIAL)
12. Actos administrativos
- Anexos: documentos adjuntos

---

## Migraciones

Ninguna — Sprint 4 no introduce nuevos modelos persistidos. Todos los servicios operan sobre modelos existentes de sprints anteriores.

---

## Tests

**Total: 106 tests — 100% OK**

| Módulo | Tests | Descripción |
|---|---|---|
| `apps.analisis` | 11 | Motor elegibilidad + consolidador |
| `apps.reten` | 5 | Detección automática + preservación manuales |
| `apps.common.tests_validators` | 11 | Reglas declarativas + endpoint validación |
| `apps.mfmp` | 18 | (heredados sprint 2) |
| `apps.talento` | 10 | (heredados sprint 1) |
| `apps.nomina` | 6 | (heredados sprint 1) |
| `apps.manual_legacy` + otros | 29 | (heredados sprint 3) |
| `apps.core.tests_sprint0` | 15 | (heredados sprint 0) |
| + demás apps | 1 | (otros) |

---

## Frontend (Next.js 14)

| Archivo | Descripción |
|---|---|
| `src/app/analisis/elegibilidad/page.tsx` | Wizard: selección de niveles, tabla de resultados, estimación de costo |
| `src/app/validacion/page.tsx` | Selector de reestructuración para validar |
| `src/app/validacion/[restructuringId]/page.tsx` | Dashboard 3 columnas: errores / advertencias / info |
| `src/app/reten-social/page.tsx` | Añadido botón "Sincronizar desde hojas de vida" con resumen de resultado |
| `src/app/reestructuraciones/[id]/objetivos/page.tsx` | Añadido botón "Generar Estudio Técnico" que descarga el DOCX |
| `src/types/index.ts` | PromotionEligibility, EligibilityStatus, EligibilityBulkResult, EligibilityCostEstimate, ValidationFinding, ValidationReport, RetenSyncResult |
| `src/components/layout/Sidebar.tsx` | Añadidos "Elegibilidad" (GraduationCap, M20) y "Validación" (CheckCircle, M4R) |

---

## Puertas de calidad

| Puerta | Resultado |
|---|---|
| `makemigrations` | No changes detected |
| `migrate` | No migrations to apply |
| `makemigrations --dry-run` | No changes detected |
| `check` | 0 issues |
| Test suite 106 tests | 106/106 OK |
| `npm run typecheck` | Sin errores |
| `seed_permissions --force` | 384 celdas (48 modelos × 8 grupos) |
| `loaddata seed_jota.json` | 76 objetos (5 intents nuevos pks 71–75) |

---

## Fixture Jota

Añadidos 5 intents (pks 71–75):
- `analisis-elegibilidad` (pk 71)
- `reten-automatico` (pk 72)
- `validadores-legales` (pk 73)
- `estudio-tecnico-consolidado` (pk 74)
- `motor-decisiones` (pk 75)

---

## Decisiones técnicas

- **EligibilityViewSet sin modelo**: se usa `viewsets.ViewSet` (no ModelViewSet) porque no hay tabla que persistir. El `get_queryset` devuelve `Employee.objects.none()` para satisfacer el mixin de tenant sin exponer datos.
- **Reglas duplicadas ignoradas**: el endpoint de validación usa un set de `seen_codes` para evitar hallazgos duplicados si una regla queda registrada dos veces (p.ej. por reload en desarrollo).
- **Rules se cargan en ready()**: el import de `apps.common.rules` en `apps/common/apps.py` garantiza que todas las reglas se registren antes de cualquier request, incluyendo tests.
- **Consolidador resiliente**: cada capítulo tiene `try/except` para que un error en un módulo no detenga la generación del DOCX completo — el capítulo aparece con "(sin información cargada)".
- **Retén automático idempotente**: se usa `filter().first()` en lugar de `get_or_create` para poder decidir entre crear, actualizar o ignorar (manuales).

---

## Pendientes conocidos

- **Frontend edición de resultados de elegibilidad**: la tabla muestra resultados de solo lectura. Un futuro sprint podría añadir workflow de aprobación/rechazo por HR.
- **Validación en tiempo real**: actualmente la validación se ejecuta on-demand (GET). Una mejora sería ejecutarla automáticamente al guardar cambios en los módulos relevantes.
- **Reglas adicionales por Decreto 2489/2006**: las equivalencias para entidades del orden nacional (D-2489) no están implementadas en el motor — solo D-785/2005 (territorial).
- **Estudio técnico con firma digital**: el DOCX generado es un borrador de trabajo sin membrete oficial ni firma. Para uso formal requeriría un proceso de firma digital.
- **Paginación en bulk_analyze_level**: si una entidad tiene miles de empleados, el análisis masivo podría ser lento. Candidato a tarea Celery en sprints futuros.
