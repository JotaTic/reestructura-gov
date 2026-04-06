# Sprint 2 — MFMP Ley 819 (M17)

**Objetivo:** Implementar el Marco Fiscal de Mediano Plazo (MFMP) conforme a la Ley 819/2003.
Permite a las entidades proyectar ingresos, gastos y deuda a 10 años, validar indicadores
de la Ley 617/2000 y Ley 358/1997, y generar la ficha de impacto fiscal (art. 7 Ley 819).

---

## Modelos nuevos (`apps.mfmp`)

| Modelo | Propósito |
|---|---|
| `MFMP` | Marco Fiscal de una entidad. `unique_together (entity, base_year, name)`. |
| `MFMPIncomeProjection` | Proyección de ingresos por año y concepto. `unique_together (mfmp, year, concept)`. |
| `MFMPExpenseProjection` | Proyección de gastos por año y concepto. `unique_together (mfmp, year, concept)`. |
| `MFMPDebtProjection` | Proyección de deuda por año. `unique_together (mfmp, year)`. |
| `MFMPScenario` | Escenario de sobreescritura por año/concepto. Constraint de unicidad de baseline. |

Todos heredan `AuditedModel`. Registrados en `AUDIT_MODELS`: `mfmp.MFMP`, `mfmp.MFMPScenario`.

### Enums

- **IncomeConcept**: TRIBUTARIOS, NO_TRIBUTARIOS, TRANSFERENCIAS_SGP, TRANSFERENCIAS_OTRAS,
  REGALIAS, COFINANCIACION, CREDITO, RECURSOS_BALANCE, OTROS.
- **ExpenseConcept**: FUNCIONAMIENTO_PERSONAL, FUNCIONAMIENTO_GENERALES,
  FUNCIONAMIENTO_TRANSFERENCIAS, SERVICIO_DEUDA, INVERSION, OTROS.

---

## Migración generada

- `mfmp/migrations/0001_initial.py`

---

## Endpoints nuevos

| Ruta | Método | Descripción |
|---|---|---|
| `GET/POST /api/mfmp/` | GET/POST | CRUD de MFMPs por entidad activa. |
| `GET /api/mfmp/{id}/matriz/` | GET | Matriz de proyección año × concepto. |
| `GET /api/mfmp/{id}/ley-617/` | GET | Indicadores Ley 617/2000 por año. |
| `GET /api/mfmp/{id}/ley-358/` | GET | Indicadores Ley 358/1997 por año. |
| `POST /api/mfmp/{id}/importar-fut/` | POST | Importa proyecciones desde Excel FUT. |
| `GET /api/mfmp/{id}/simular/` | GET | Simula impacto fiscal de una planta (`?plan=<id>`). |
| `GET /api/mfmp/{id}/ficha-impacto-fiscal/` | GET | Genera ficha Ley 819 art. 7 DOCX (`?plan=<id>`). |
| `GET /api/mfmp/{id}/export/{xlsx|docx}/` | GET | Export general del MFMP. |
| `GET/POST /api/mfmp-ingresos/` | CRUD | Proyecciones de ingresos (filtrable por `?mfmp=`). |
| `GET/POST /api/mfmp-gastos/` | CRUD | Proyecciones de gastos (filtrable por `?mfmp=`). |
| `GET/POST /api/mfmp-deuda/` | CRUD | Proyecciones de deuda (filtrable por `?mfmp=`). |
| `GET/POST /api/mfmp-escenarios/` | CRUD | Escenarios (filtrable por `?mfmp=`). |

---

## Servicios (`apps/mfmp/services.py`)

| Función | Propósito |
|---|---|
| `get_projection_matrix(mfmp)` | Matriz completa años × conceptos con totales. |
| `calculate_law_617_by_year(mfmp)` | Indicadores Ley 617/2000 por año (ICLD / funcionamiento / ratio). |
| `calculate_law_358_by_year(mfmp)` | Indicadores Ley 358/1997 por año (solvencia / sostenibilidad). |
| `simulate_plan_impact(mfmp, plan)` | Simula impacto de una planta. No modifica la DB. |
| `import_fut_excel(file, mfmp)` | Parser tolerante de Excel FUT. Idempotente (update_or_create). |
| `generate_fiscal_impact_sheet(mfmp, plan)` | Genera ficha DOCX Ley 819 art. 7. |

### Ley 617 — límites por categoría municipal
- ESPECIAL: 50% · 1ª: 65% · 2ª/3ª: 70% · 4ª/5ª/6ª/NA: 80%
- Orden NACIONAL/DEPARTAMENTAL/DISTRITAL: 50% (simplificado)

### Ley 358 — semáforo de solvencia
- Verde: solvencia < 40% · Amarillo: 40–60% · Rojo: ≥ 60%
- Solvencia = servicio_deuda / ahorro_operacional
- Sostenibilidad = saldo_deuda / ingresos_corrientes

---

## Cambios en apps existentes

- **`apps/planta/models.py`**: añadido `PayrollPlan.fiscal_impact(mfmp)` — import tardío para evitar ciclos.
- **`apps/common/apps.py`**: añadidos `mfmp.MFMP` y `mfmp.MFMPScenario` a `AUDIT_MODELS`.
- **`apps/common/module_exports.py`**: añadida función `export_mfmp(mfmp)` con tablas de ingresos, gastos, deuda y Ley 617.

---

## Management commands

```bash
# Crea MFMP de demo para la primera entidad (idempotente)
python manage.py seed_mfmp_demo
```

Crea: MFMP 2026–2035, 90 proyecciones de ingresos (9 conceptos × 10 años),
60 de gastos (6 × 10), 10 de deuda y un escenario baseline.

---

## Archivos frontend

| Archivo | Descripción |
|---|---|
| `src/app/mfmp/page.tsx` | Listado de MFMPs con botón "Nuevo MFMP" |
| `src/app/mfmp/[id]/page.tsx` | Detalle con 6 pestañas |
| `src/types/index.ts` | Tipos: MFMP, MFMPIncomeProjection, MFMPExpenseProjection, MFMPDebtProjection, MFMPScenario, MFMPSimulation, MFMPLawByYear, MFMPIncomeConcept, MFMPExpenseConcept |
| `src/components/layout/Sidebar.tsx` | Ítem "MFMP (Ley 819)" con icono TrendingUp y badge "M17" en sección Diagnóstico |

### Pestañas del detalle (`/mfmp/[id]`)
1. **Matriz** — tabla año × concepto (ingresos y gastos)
2. **Ley 617** — tabla semáforo con ratio vs límite por año
3. **Ley 358** — tabla solvencia/sostenibilidad con semáforo
4. **Simulación** — selector de plan + botón Simular + tabla baseline vs simulado + botón Descargar ficha Ley 819
5. **Escenarios** — listado de escenarios del MFMP
6. **Importar FUT** — upload de Excel (.xlsx)

---

## Fixture Jota

Añadidos 5 intents (pks 61–65):
- `mfmp` (pk 61) — Descripción del módulo M17
- `ley-819` (pk 62) — Marco Fiscal y sostenibilidad
- `impacto-fiscal` (pk 63) — Impacto fiscal de la reestructuración
- `simular-planta-fiscal` (pk 64) — Simulación de impacto de planta
- `ficha-impacto-fiscal` (pk 65) — Ficha de impacto fiscal art. 7

Total: 66 objetos en el fixture.

---

## Tests (`apps/mfmp/tests.py`)

18 tests distribuidos en 7 clases:

| Test | Clase |
|---|---|
| `test_create_mfmp_with_incomes_expenses` | ProjectionMatrixTest |
| `test_matrix_has_all_keys` | ProjectionMatrixTest |
| `test_expense_total_by_year` | ProjectionMatrixTest |
| `test_law_617_compliant_when_expenses_low` | Law617Test |
| `test_law_617_breaks_when_expenses_high` | Law617Test |
| `test_simulate_plan_empty_equals_baseline` | SimulatePlanImpactTest |
| `test_simulate_plan_with_positions_increases_funcionamiento` | SimulatePlanImpactTest |
| `test_simulate_returns_required_keys` | SimulatePlanImpactTest |
| `test_import_fut_excel` | ImportFutExcelTest |
| `test_import_fut_idempotent` | ImportFutExcelTest |
| `test_import_fut_missing_sheet_warns` | ImportFutExcelTest |
| `test_fiscal_impact_sheet_generates_docx` | FiscalImpactSheetTest |
| `test_api_mfmp_crud_as_superuser` | MFMPAPITest |
| `test_api_matriz_action` | MFMPAPITest |
| `test_scenario_unique_baseline` | MFMPConstraintTest |
| `test_unique_together_income` | MFMPConstraintTest |
| `test_entity_isolation` | MFMPEntityIsolationTest |
| `test_entity_a_only_sees_own_mfmps` | MFMPEntityIsolationTest |

---

## Puertas de calidad ejecutadas

| Puerta | Resultado |
|---|---|
| `makemigrations` | 1 migración generada (`0001_initial.py`) |
| `migrate` | OK |
| `seed_mfmp_demo` | OK — 90 ingresos, 60 gastos, 10 deuda, 1 escenario |
| `makemigrations --dry-run` | **No changes detected** |
| `check` | **0 issues** |
| `test apps.mfmp apps.talento apps.nomina apps.core.tests_sprint0` | **49/49 OK** |
| `npm run typecheck` | **sin errores** |
| `seed_permissions --force` | OK — 320 celdas (40 modelos × 8 grupos) |
| `loaddata seed_jota.json` | OK — 66 objetos |

---

## Decisiones técnicas

- **`seed_permissions` incluye mfmp**: el modelo `mfmp.MFMP` se añade automáticamente
  a la matriz porque `seed_permissions` itera los modelos instalados dinámicamente.
- **ICLD simplificado**: Ley 617 usa solo TRIBUTARIOS + NO_TRIBUTARIOS como ICLD
  (ingresos corrientes de libre destinación). El SGP y otros se incluyen en Ley 358
  como ingresos corrientes para el cálculo del ahorro operacional.
- **Simulación no destructiva**: `simulate_plan_impact` opera solo en memoria,
  nunca escribe a la DB.
- **Import FUT tolerante**: normaliza conceptos por palabras clave, no requiere
  mapeo exacto. Registra warnings en lugar de fallar.
- **Test de aislamiento**: usa superuser + `X-Entity-Id` para verificar que el
  queryset solo devuelve MFMPs de la entidad indicada.
- **Cache de permisos**: `MFMPEntityIsolationTest.tearDown` llama `cache.clear()`
  para evitar interferencias entre tests de permisos.

---

## Pendientes conocidos

- **FUT oficial completo**: el FUT real tiene decenas de códigos de rentas y gastos
  (clasificación CPC). El parser actual acepta columnas simples 'concepto/año/valor'.
  Un parser completo requeriría mapeo por código según el Plan de Cuentas.
- **Frontend edición en línea de la matriz**: la pestaña Matriz muestra los datos
  pero no permite edición directa celda × celda. Edición se hace vía CRUD de ingresos/gastos.
- **Escenarios con aplicación**: los escenarios almacenan `deltas_json` pero aún no
  se aplican automáticamente en los indicadores. Pendiente para un sub-sprint.
- **Certificado Ley 819**: la ficha de impacto no incluye firma digital ni membrete
  oficial. Es un borrador de trabajo.
