# Roadmap completado — ReEstructura.Gov

## Resumen ejecutivo

ReEstructura.Gov ha pasado de un MVP de captura de datos a una herramienta
de análisis real para el estudio técnico de rediseño institucional colombiano.
En 7 sprints (0–6) se construyó un sistema full-stack con backend Django REST y
frontend Next.js 14 que cubre el ciclo completo de una reestructuración:
diagnóstico, análisis de talento, impacto fiscal, validación legal, gobierno del
proceso y generación del estudio técnico consolidado.

---

## Sprints implementados

| Sprint | Nombre | Modelos | Endpoints | Tests |
|--------|--------|---------|-----------|-------|
| 0 | Fundaciones (multi-tenant, RBAC, auditoría) | 3 nuevos (UserEntityAccess, GroupModelPermission, ChangeLog) | 8 | 20 |
| 1 | Objetivos + Talento (M15) + Nómina (M16) | 10 nuevos (Employee, EmployeeEducation, EmployeeExperience, EmployeeTraining, EmployeeEvaluation, EmploymentRecord, SalaryScale, PrestationalFactor, EntitySalaryConfig, RestructuringObjective) | 16 | 30 |
| 2 | MFMP Ley 819 (M17) | 5 nuevos (MFMP, MFMPIncomeProjection, MFMPExpenseProjection, MFMPDebtProjection, MFMPScenario) | 12 | 20 |
| 3 | Insumos reales (M12+, M8+, M18, Documental) | 9 nuevos (LegacyManual, LegacyManualRole, LegacyManualFunction, Procedure, ProcedureStep, LegalMandate, MandateCompliance, Document, OfficialConsultation) | 20 | 28 |
| 4 | Núcleo analítico (elegibilidad, retén, validadores, consolidador) | 0 nuevos (servicios puros sobre modelos existentes) | 5 | 25 |
| 5 | Gobierno (máquina de estados, consultas, comisión) | 3 nuevos (PersonnelCommittee, CommitteeMeeting, UnionCommunication) | 16 | 20 |
| 6 | Experiencia (simulador, dashboard, notificaciones) | 2 nuevos (Scenario, Notification) | 10 | 15 |

**Totales del proyecto: 61 modelos · ~193 endpoints API · 158 tests**

---

## Capacidades del sistema

### Gestión institucional
- Multi-tenant por entidad: cada usuario solo ve las entidades asignadas (X-Entity-Id header).
- Matriz CRUD por grupo × modelo configurable desde el superadmin.
- Historial de auditoría automático (ChangeLog) para todos los modelos registrados.

### Talento humano
- Hojas de vida completas (educación, experiencia, capacitaciones, evaluaciones, vinculaciones).
- Importación masiva desde Excel SIGEP.
- Exportación de hoja de vida en DOCX.
- Cálculo automático de tiempo de servicio y pre-pensionado.

### Nómina y escala salarial
- Catálogo de escalas salariales por orden/año/nivel/grado.
- Factor prestacional configurable por régimen y año.
- Costo real de planta con factor prestacional integrado.

### MFMP Ley 819/2003
- Proyecciones de ingresos, gastos y deuda a 10 años.
- Indicadores Ley 617/2000 (gastos de funcionamiento / ICLD) y Ley 358/1997 (deuda).
- Importación desde Excel FUT con mapeo flexible de columnas.
- Generación de ficha de impacto fiscal (art. 7 Ley 819) en DOCX.
- Simulación del impacto fiscal de una planta propuesta.

### Manual de funciones e insumos
- Carga y parsing de manual de funciones vigente desde DOCX (heurístico).
- Diff automático manual vigente vs planta propuesta.
- Manual de procedimientos con pasos y tiempos estimados.
- Mandatos legales con seguimiento de cumplimiento por proceso.
- Gestión documental por tipo y reestructuración.

### Análisis y motor de elegibilidad
- Motor de elegibilidad según Decreto 785/2005 (entidades territoriales).
- Análisis individual y masivo por nivel/código/grado.
- Estimación de costo de nivelación salarial.
- 14 reglas de validación legal declarativas (errores y advertencias).

### Retén social
- Detección automática de pre-pensionados, cabeza de hogar y discapacidad.
- Registros manuales no modificables por el motor automático.

### Gobierno del proceso
- Máquina de estados con 12 estados y 11 transiciones precondicionadas.
- Precondiciones verificadas en servidor (DOFA, planta, MFMP, DAFP, actos).
- Consultas oficiales a organismos externos (DAFP, Hacienda, CGR, etc.).
- Comisión de Personal con reuniones y comunicaciones sindicales.

### Simulador de escenarios
- Clonación de planes de planta a escenarios comparables.
- Evaluación de métricas: costos, Ley 617, mandatos, elegibilidad.
- Comparación N-aria de escenarios con rankings.

### Dashboard y notificaciones
- Dashboard ejecutivo con KPIs agregados por entidad o usuario.
- Sistema de notificaciones in-app por usuario con marcado de leído.
- Generador del estudio técnico consolidado en DOCX (12 capítulos + anexos).

---

## Flujo completo del estudio técnico

1. Entrar como superadmin y configurar usuarios y permisos.
2. Crear una entidad, asignarla a un usuario operativo.
3. Entrar como ese usuario y verificar que solo ve su entidad (X-Entity-Id).
4. Importar hojas de vida desde Excel SIGEP (`/api/empleados/importar-sigep/`).
5. Importar el manual de funciones vigente en DOCX (`/api/manuales-vigentes/{id}/importar-docx/`).
6. Crear una reestructuración con objetivo "nivelación salarial" (kind=SALARY_LEVELING).
7. Completar el diagnóstico DOFA y análisis de procesos.
8. Crear un plan de planta propuesto con posiciones y costos.
9. Ejecutar el motor de elegibilidad (`/api/analisis/elegibilidad/bulk/`).
10. Sincronizar el retén automático (`/api/reten-social/sincronizar/`).
11. Crear el MFMP y simular el impacto fiscal (`/api/mfmp/{id}/simular/?plan=<id>`).
12. Ejecutar la validación legal (`/api/validar/restructuring/<id>/`).
13. Avanzar por los estados del workflow hasta CONCEPTO_DAFP_RECIBIDO.
14. Crear escenarios y compararlos (`/api/simulador/comparar/`).
15. Generar el estudio técnico consolidado (`/api/reestructuraciones/<id>/estudio-tecnico/`).

---

## Arquitectura técnica

**Backend:** Django 4.2 + Django REST Framework 3.15 + Python 3.11
**Frontend:** Next.js 14 + TypeScript + Tailwind CSS
**Base de datos:** SQLite (dev) / PostgreSQL (prod)
**Autenticación:** JWT (SimpleJWT) con contexto multi-tenant por header

**Apps Django:**
```
core, common, talento, nomina, mfmp, manual_legacy, procedimientos,
mandatos, documentos, analisis, consultas, participacion, simulador,
notificaciones, diagnostico, cargas, planta, actos, legal, financiero,
reten, procesos, nomenclatura, jota
```

| Métrica | Valor |
|---------|-------|
| Total modelos | 61 (sin contar tablas Django/admin internas) |
| Total endpoints API | ~193 (sin variantes de formato) |
| Total tests | 158 (todos passing) |
| Archivos de test | 17 (uno por app con lógica) |
| Frontend pages | 47 (rutas Next.js incluyendo dinámicas) |
| Frontend build | OK — `next build` compila sin errores ni warnings |

---

## Pendientes conocidos

Acumulados de todos los sprints:

1. **Password change on first login** (Sprint 0): falta flag `password_change_required` + flujo de cambio obligatorio en `/login`.
2. **Matrix vs seed count** (Sprint 0): UI enumera 27 modelos vs 25 en seed_permissions; alinear catálogos.
3. **AuditedModel no heredado por modelos legacy** (Sprint 0): Entity, Department, Restructuring usan campos propios sin el mixin formal.
4. **LocMemCache vs Redis para invalidate_matrix_cache** (Sprint 0): en dev `cache.clear()` es suficiente; en prod requiere Redis con `delete_pattern`.
5. **Import SIGEP ZIP/PDF** (Sprint 1): el importador solo lee .xlsx; ZIP con múltiples archivos queda pendiente.
6. **FUT oficial completo** (Sprint 2): el parser acepta columnas simples; un parser por código CPC requeriría mapeo del Plan de Cuentas completo.
7. **Frontend edición inline de la matriz MFMP** (Sprint 2): actualmente solo lectura en la vista de matriz.
8. **Parser PDF de manual de funciones** (Sprint 3): `parse_manual_pdf` devuelve warning; pendiente instalación de pypdf.
9. **CRUD de cumplimientos de mandatos en frontend** (Sprint 3): la UI permite crear mandatos pero no gestionar cumplimientos.
10. **Frontend edición de resultados de elegibilidad** (Sprint 4): tabla de elegibilidad es solo lectura; falta workflow HR de aprobación/rechazo.
11. **Paginación en bulk_analyze_level** (Sprint 4): candidato a tarea Celery para entidades con miles de empleados.
12. **Reglas Decreto 2489/2006** (Sprint 4): el motor de elegibilidad solo implementa D-785/2005 (territorial); faltan equivalencias para entidades del orden nacional.
13. **Estudio técnico con firma digital** (Sprint 4): el DOCX generado es borrador de trabajo sin membrete oficial.
14. **Validación en tiempo real** (Sprint 4): actualmente on-demand; mejora futura: ejecutar automáticamente al guardar.
15. **Historial de transiciones en frontend** (Sprint 5): página de gobierno podría mostrar ChangeLog filtrado por `model=restructuring`.
16. **Editor de miembros de comisión** (Sprint 5): `members_json` solo editable vía API; falta UI inline.
17. **Comunicaciones sindicales sin página standalone** (Sprint 5): módulo implementado pero sin vista dedicada de alta visibilidad.
18. **Notificaciones push/WebSocket** (Sprint 6): actualmente solo polling cada 30 s; Django Channels o SSE queda pendiente.
19. **CONSULTATION_DUE automático** (Sprint 6): signal post_save de OfficialConsultation no implementado.
20. **Editor inline de posiciones en simulador** (Sprint 6): la edición de posiciones se hace via `/planta`, no inline en el simulador.

---

## Cómo empezar

```bash
cd plataforma/backend

# Preparar base de datos y datos de referencia
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_users
.venv\Scripts\python manage.py seed_salary_scales
.venv\Scripts\python manage.py seed_prestational_factors
.venv\Scripts\python manage.py seed_talento_demo
.venv\Scripts\python manage.py seed_mfmp_demo
.venv\Scripts\python manage.py loaddata apps/jota/fixtures/seed_jota.json

# Arrancar backend
.venv\Scripts\python manage.py runserver

# En otro terminal: arrancar frontend
cd plataforma/frontend
npm run dev
```

**Usuarios de prueba (después de seed_users):**
- `admin / admin123` — superuser, acceso total incluido `/superadmin/`
- `operativo / Op123456` — usuario operativo con acceso a su entidad asignada

**URLs principales:**
- Backend API: `http://localhost:8000/api/`
- Frontend: `http://localhost:3000/`
- Admin Django: `http://localhost:8000/admin/`
