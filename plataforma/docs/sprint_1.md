# Sprint 1 — Objetivos + Hojas de vida (M15) + Escala salarial (M16)

**Objetivo:** Añadir tipología de objetivos a las reestructuraciones, un módulo completo
de hojas de vida de empleados (M15) con importación SIGEP y cálculos de tiempo de servicio
y elegibilidad de pensión, y un módulo de escala salarial con factor prestacional (M16).

---

## Modelos añadidos

| Modelo | App | Propósito |
|---|---|---|
| `RestructuringObjective` | `core` | Objetivos de reestructuración (16 kinds). `unique_together (restructuring, kind)`. |
| `Employee` | `talento` | Empleado de una entidad. Datos básicos, contacto, discapacidad, jefe de hogar. |
| `EmployeeEducation` | `talento` | Historial académico del empleado. |
| `EmployeeExperience` | `talento` | Experiencia laboral (sector público/privado). |
| `EmployeeTraining` | `talento` | Capacitaciones y cursos. |
| `EmployeeEvaluation` | `talento` | Evaluaciones de desempeño anuales. |
| `EmploymentRecord` | `talento` | Vinculaciones laborales (posesión, retiro, tipo de nombramiento). |
| `SalaryScale` | `nomina` | Escala salarial de referencia por orden/año/nivel/grado (catálogo). |
| `PrestationalFactor` | `nomina` | Factor prestacional por régimen/año con detalle de componentes. |
| `EntitySalaryConfig` | `nomina` | Configuración salarial específica de una entidad. |

### Cambios en modelos existentes
- `planta.PayrollPosition`: añade `occupant` FK a `talento.Employee` (null, SET_NULL).
- `reten.ProtectedEmployee`: añade `employee_ref` FK a `talento.Employee` (null, SET_NULL) e `is_manual` BooleanField.

---

## Migraciones generadas

- `core/migrations/0006_restructuringobjective.py`
- `talento/migrations/0001_initial.py`
- `nomina/migrations/0001_initial.py`
- `planta/migrations/0004_payrollposition_occupant_and_more.py`
- `reten/migrations/0002_protectedemployee_employee_ref_and_more.py`

---

## Endpoints nuevos

| Ruta | Método | Descripción |
|---|---|---|
| `GET /api/objetivos/` | GET | Lista objetivos de la reestructuración activa. |
| `POST /api/objetivos/` | POST | Crea nuevo objetivo. |
| `GET /api/objetivos/definitions/` | GET | Devuelve OBJECTIVE_DEFINITIONS (16 kinds). |
| `GET /api/empleados/` | GET/POST | CRUD de empleados por entidad activa. |
| `GET /api/empleados/{id}/hoja-de-vida/` | GET | Empleado completo con sub-tablas + cálculos. |
| `POST /api/empleados/importar-sigep/` | POST | Importa empleados desde Excel SIGEP. |
| `GET /api/empleados/{id}/export-cv/docx/` | GET | Exporta hoja de vida en Word. |
| `GET /api/empleados-educacion/` | GET/POST | CRUD de educación. |
| `GET /api/empleados-experiencia/` | GET/POST | CRUD de experiencia. |
| `GET /api/empleados-capacitacion/` | GET/POST | CRUD de capacitaciones. |
| `GET /api/empleados-evaluaciones/` | GET/POST | CRUD de evaluaciones. |
| `GET /api/empleados-vinculaciones/` | GET/POST | CRUD de vinculaciones. |
| `GET /api/escalas-salariales/` | GET | Escala salarial de referencia (read-only). |
| `GET /api/factores-prestacionales/` | GET | Factores prestacionales (read-only). |
| `GET/POST /api/config-salarial/` | GET/POST | Configuración salarial de la entidad. |
| `GET /api/planes/{id}/costo-real/` | GET | Costo real de planta con factor prestacional (M16). |

---

## Management commands (seeds)

```bash
# Escala salarial 2026 (~20 filas TERRITORIAL + NACIONAL)
python manage.py seed_salary_scales

# Factores prestacionales 2026
python manage.py seed_prestational_factors

# 5 empleados demo (perfiles variados)
python manage.py seed_talento_demo
```

---

## Tests incluidos

### `apps/talento/tests.py`

- `ImportSigepExcelTest.test_imports_two_employees_from_memory_workbook` — Workbook en memoria con 2 empleados crea 2 Employee.
- `ImportSigepExcelTest.test_idempotent_on_second_run` — Segunda ejecución actualiza sin duplicar.
- `ImportSigepExcelTest.test_missing_sheet_reports_warning` — Hoja no encontrada → warning.
- `RetirementEligibilityTest.test_female_56_with_24_years_is_pre_pensioned` — Mujer 56 años + 24 de exp. pública → pre-pensionada.
- `RetirementEligibilityTest.test_young_male_not_pre_pensioned` — Hombre joven → no pre-pensionado.
- `RetirementEligibilityTest.test_returns_correct_keys` — Claves de respuesta correctas.
- `EmployeeAPITest.test_consulta_can_get_employee_list` — GET con Consulta → 200.
- `EmployeeAPITest.test_consulta_cannot_post_employee` — POST con Consulta → 403.
- `ObjectiveDefinitionsAPITest.test_definitions_returns_16_kinds` — GET /definitions/ → 16 kinds.
- `ObjectiveDefinitionsAPITest.test_all_definitions_have_required_keys` — Cada definición tiene todas las claves.

### `apps/nomina/tests.py`

- `CalculateAnnualCostTest.test_annual_cost_with_factor_1_62` — base 3M × 1.62 × 12 = 58.32M.
- `CalculateAnnualCostTest.test_effective_monthly_cost` — costo mensual = base × factor.
- `CalculateAnnualCostTest.test_zero_salary_returns_zero` — salario 0 → costo 0.
- `ApplySalaryScaleTest.test_apply_updates_at_least_one_position` — 3 posiciones, al menos 1 actualizada.
- `ApplySalaryScaleTest.test_apply_sets_correct_salary` — PROFESIONAL 219-01 → 3.800.000.
- `ApplySalaryScaleTest.test_apply_returns_count` — retorna cantidad exacta actualizada.

**Total: 31/31 tests (16 Sprint 1 + 15 Sprint 0)**

---

## Puertas de calidad ejecutadas

| Puerta | Resultado |
|---|---|
| `makemigrations` | 5 nuevas migraciones generadas |
| `migrate` | OK — todas aplicadas |
| `seed_users` | OK — 280 celdas de permisos (35 modelos × 8 grupos) |
| `seed_salary_scales` | OK — 20 filas |
| `seed_prestational_factors` | OK — 2 factores |
| `seed_talento_demo` | OK — 5 empleados en primera entidad |
| `makemigrations --dry-run` | **No changes detected** |
| `check` | **0 issues** |
| `test apps.talento apps.nomina apps.core.tests_sprint0` | **31/31 OK** |
| `npm run typecheck` | **sin errores** |
| `loaddata seed_jota.json` | OK — 61 objetos (5 intents nuevos: pk 56-60) |
| `seed_permissions --force` | OK — 280 celdas |

---

## Archivos frontend creados

- `src/app/talento/page.tsx` — Redirect a /talento/empleados
- `src/app/talento/empleados/page.tsx` — Lista con tabla, modal nuevo empleado, modal importar SIGEP
- `src/app/talento/empleados/[id]/page.tsx` — Hoja de vida con pestañas (Básica/Estudios/Experiencia/Capacitación/Evaluaciones/Empleos)
- `src/app/reestructuraciones/[id]/objetivos/page.tsx` — CRUD de RestructuringObjective
- `src/types/index.ts` — Tipos: Employee, EmployeeEducation, EmployeeExperience, EmployeeTraining, EmployeeEvaluation, EmploymentRecord, RestructuringObjective, ObjectiveKind, ObjectiveDefinition, etc.
- `src/components/layout/Sidebar.tsx` — Item "Hojas de vida" (IdCard) en sección "Talento"

---

## Pendientes conocidos

- **Import SIGEP ZIP/PDF**: el importador lee solo .xlsx. La importación de ZIP (con múltiples archivos SIGEP) y extracción de PDF queda como TODO documentado en `services.py`.
- **Frontend minimalista en pestañas de detalle**: las pestañas de empleado muestran datos de solo lectura; los botones "Añadir" en cada pestaña no están implementados (frontend mínimo funcional según sprint).
- **ExportBar**: no se añadió ExportBar en páginas nuevas de talento. El export de hoja de vida existe en el endpoint `/export-cv/docx/` pero no hay botón UI.
- **seed_users no corre automáticamente los seeds de nómina**: mencionado en el roadmap como opción; se dejó como commands independientes para evitar efectos no deseados en staging.
- **Modelos de catálogo (SalaryScale, PrestationalFactor)**: no heredan AuditedModel por diseño (son catálogos normativos). El EntitySalaryConfig sí hereda AuditedModel.
