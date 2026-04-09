# PROMPT: Implementación completa de ReEstructura.Gov — Todas las fases y funcionalidades pendientes

## CONTEXTO

Eres un desarrollador full-stack experto trabajando en **ReEstructura.Gov**, una plataforma web para reestructuración de entidades públicas colombianas. Stack: Django 5 + DRF (backend), Next.js 14 + React + Tailwind (frontend), PostgreSQL. Desplegada en producción en `reestructuracion.corpofuturo.org`.

La plataforma ya tiene 27 módulos Django y 50+ páginas frontend funcionando. El documento "Flujo de Reestructuración Completo" define el proceso integral con 6 fases, 12 estados y 16 tipos de objetivo.

**REGLA DE AUTONOMÍA**: NO presentar opciones. Tomar decisiones directamente. Solo preguntar en decisiones irreversibles.

---

## MENÚ LATERAL REORGANIZADO (implementar primero)

El menú actual está desordenado. Reorganizarlo para que siga **exactamente el flujo de las fases** de la reestructuración, de arriba hacia abajo:

```
── INICIO
   Dashboard (resumen ejecutivo + panel de progreso)  ← NUEVO: panel de progreso

── FASE 0 · CONFIGURACIÓN
   Entidades
   Dependencias (con niveles: Despacho→Secretaría→...)
   Estructura orgánica (árbol + organigrama)
   Nomenclatura (Dec. 785/2005 y 2489/2006)

── FASE 1 · ACUERDO INICIAL
   Reestructuración (expediente activo)
   Objetivos (16 tipos)
   Cronograma (Anexo 1)
   Equipo técnico                                     ← NUEVO

── FASE 2 · DIAGNÓSTICO
   Diagnóstico (DOFA 5 dimensiones)
   Marco legal correlacionado
   Análisis de entornos
   Mandatos legales
   Base legal (catálogo normativo)

── FASE 3 · DISEÑO TÉCNICO
   Procesos (mapa actual → propuesto)
   Procedimientos
   Matriz de cargas (Anexo 5)
   Encuestas de cargas (portal público)
   Contratistas OPS/CPS
   Análisis de brechas
   Planta de personal (actual → propuesta)
   Comparativo planta                                 ← Ya existe en /planta/comparar
   Manual de funciones (vigente + propuesto)
   Escala salarial

── FASE 4 · ANÁLISIS Y REVISIONES
   Validación (motor de reglas)
   Análisis financiero (Ley 617/358)
   MFMP (Ley 819)
   Simulador de escenarios
   Elegibilidad
   Indemnizaciones y costos                           ← NUEVO
   Estudio técnico                                    ← NUEVO: generador consolidado

── FASE 5 · GOBIERNO Y APROBACIÓN
   Gobierno (workflow 12 estados)
   Consultas oficiales (DAFP, MinHacienda)
   Comisión de Personal
   Comunicaciones sindicales
   Actos administrativos

── FASE 6 · IMPLEMENTACIÓN
   Plan de implementación                             ← NUEVO
   Retén social
   Hojas de vida (talento humano)

── ADMINISTRACIÓN
   Superadmin (usuarios, permisos, auditoría)
```

---

## FUNCIONALIDADES A IMPLEMENTAR (en orden de prioridad)

### BLOQUE 1 — Panel de progreso + Menú reorganizado (Sprint 14)

**1.1 Reorganizar Sidebar.tsx** según la estructura de arriba. Cada sección corresponde a una fase. Los badges deben indicar la fase (F0, F1, F2, F3, F4, F5, F6).

**1.2 Panel de progreso de la reestructuración** (`/dashboard` mejorado o nueva sección)
- Checklist visual de las 6 fases con % de completitud:
  - F0: ¿Entidad configurada? ¿Dependencias creadas? ¿Planta actual cargada?
  - F1: ¿Objetivos definidos? ¿Cronograma creado? ¿Acuerdo inicial documentado?
  - F2: ¿Diagnóstico con DOFA? ¿Marco legal? ¿Entornos? ¿Mandatos?
  - F3: ¿Procesos mapeados? ¿Cargas levantadas? ¿Brechas analizadas? ¿Planta propuesta?
  - F4: ¿0 errores validación? ¿MFMP registrado? ¿Ley 617 cumplida?
  - F5: ¿Concepto DAFP? ¿Comisión informada? ¿Actos expedidos?
- Backend: endpoint `GET /api/reestructuraciones/{id}/progreso/` que evalúa cada check.
- Frontend: barra de progreso por fase, indicadores verde/amarillo/rojo, links directos al módulo faltante.

### BLOQUE 2 — Generador de Estudio Técnico (Sprint 15)

**2.1 Endpoint `GET /api/reestructuraciones/{id}/estudio-tecnico/`** (ya existe parcialmente, completar):
- Genera documento Word/PDF con **12 capítulos**:
  1. Identificación de la entidad
  2. Acuerdo inicial (problema, objetivos, enfoque, riesgos)
  3. Objetivos de la reestructuración (tabla con indicadores)
  4. Marco legal correlacionado (cada norma vinculada a una decisión)
  5. Diagnóstico institucional (DOFA 5 dimensiones + entornos)
  6. Mapa de procesos (actual vs propuesto)
  7. Cargas de trabajo (consolidado por nivel y dependencia, fórmula TE)
  8. Análisis de brechas (tabla necesarios vs actuales vs contratistas)
  9. Planta actual vs propuesta (comparativo con costos)
  10. Análisis financiero (Ley 617, Ley 358, MFMP proyecciones)
  11. Manual de funciones propuesto (por cargo: propósito, funciones, requisitos)
  12. Actos administrativos (borradores con placeholders reemplazados)
- Incluir: portada, tabla de contenido, numeración de páginas, logos.
- Usar python-docx con estilos profesionales.

**2.2 Página `/estudio-tecnico`** con botón "Generar estudio técnico" que descarga el DOCX.

### BLOQUE 3 — Generador de Manual de Funciones Propuesto (Sprint 16)

**3.1 Backend: servicio que genera el manual propuesto** a partir de:
- Planta propuesta (cargos por dependencia)
- Cargas laborales (actividades → funciones del cargo)
- Nomenclatura (denominaciones, códigos, grados)
- Requisitos mínimos según nivel jerárquico

**3.2 Por cada cargo del manual propuesto generar**:
- I. Identificación del empleo (denominación, código, grado, nivel, dependencia)
- II. Área funcional
- III. Propósito principal (verbo + objeto + condición)
- IV. Funciones esenciales (derivadas de las actividades de la matriz de cargas)
- V. Criterios de desempeño
- VI. Conocimientos básicos o esenciales
- VII. Competencias comportamentales
- VIII. Requisitos de formación académica y experiencia
- IX. Equivalencias (art. 25 Dec. 785/2005 o art. 2.2.2.5.1 Dec. 1083/2015)

**3.3 Exportar** en Word y PDF con formato oficial DAFP.

### BLOQUE 4 — Módulo de Indemnizaciones y Costos de Supresión (Sprint 17)

**4.1 Modelo `SuppressionCost`**:
- `employee` (FK → Employee)
- `position` (FK → PayrollPosition)
- `appointment_type` (carrera, LNR, provisional, etc.)
- `years_of_service` (calculado desde vinculación)
- `monthly_salary`, `annual_salary`
- `severance_cost` (indemnización según tipo)
- `pending_benefits` (cesantías, vacaciones, prima pendientes)
- `total_suppression_cost`
- `annual_savings` (ahorro por no pagar ese cargo)
- `break_even_months` (meses para recuperar la inversión)

**4.2 Cálculo de indemnización** según tipo de vinculación:
- Carrera: 45 días × salario por primer año + 15 días × año adicional (Dec. 1083/2015)
- LNR: sin indemnización (declaración insubsistencia)
- Provisional: sin indemnización (salvo estabilidad reforzada)
- Trabajador oficial: según convención colectiva
- OPS/CPS: no aplica

**4.3 Página `/indemnizaciones`**: tabla de todos los cargos suprimidos, costo unitario y total, break-even, resumen para concepto financiero.

### BLOQUE 5 — Módulo Equipo Técnico (Sprint 18)

**5.1 Modelo `TechnicalTeamMember`**:
- `restructuring` (FK)
- `name`, `position`, `department`, `role_in_team` (coordinador, jurídico, financiero, TH, planeación)
- `email`, `phone`
- `active` (boolean)

**5.2 Página `/equipo-tecnico`**: CRUD de miembros del equipo con roles asignados.

### BLOQUE 6 — Plan de Implementación (Sprint 19)

**6.1 Modelo `ImplementationPlan`** y **`ImplementationTask`**:
- Plan vinculado a una reestructuración
- Tareas: nombre, responsable, fecha inicio, fecha fin, estado (pendiente/en progreso/completada/bloqueada), dependencias entre tareas
- Tareas típicas: notificación empleados, procesos CNSC, incorporaciones, liquidaciones, convocatorias

**6.2 Página `/implementacion`**: vista Gantt simplificada (tabla con barras de progreso), crear/editar tareas.

### BLOQUE 7 — Notificaciones por Email (Sprint 20)

**7.1 Backend**: `apps/notificaciones/email_service.py`
- Integrar con Django `send_mail` o servicio SMTP
- Eventos que disparan email:
  - Encuesta de cargas: enviar link a participante
  - Cambio de estado de la reestructuración
  - Vencimiento consulta DAFP (30 días)
  - Aprobación/rechazo
  - Asignación de tarea

**7.2 Modelo `EmailLog`**: registro de emails enviados (destinatario, asunto, estado, fecha).

**7.3 Configuración SMTP** en settings.py (variables de entorno).

### BLOQUE 8 — Validación Integral (Sprint 21)

Agregar estas reglas al motor declarativo (`apps/common/rules/`):

| Código | Severidad | Descripción |
|--------|-----------|-------------|
| R-016 | Error | Denominación de cargo no existe en Dec. 785/2005 ni 2489/2006 |
| R-017 | Warning | Cargo con grado fuera del rango permitido para su nivel |
| R-018 | Error | Todo mandato legal debe tener al menos un proceso asignado |
| R-019 | Warning | Dependencia sin cargos asignados en planta propuesta |
| R-020 | Error | Requisitos mínimos de educación no cumplidos por el ocupante |
| R-041 | Error | Empleado con retén social incluido en lista de supresión |
| R-042 | Warning | Costo planta propuesta excede disponibilidad MFMP |
| R-043 | Warning | Contratista OPS/CPS con >6 meses ejecutando funciones permanentes |
| R-050 | Error | Planta propuesta sin concepto financiero favorable |
| R-082 | Error | Indicador Ley 358 (sostenibilidad deuda) incumplido |

### BLOQUE 9 — Mejoras de UX (Sprint 22)

**9.1 Reportes ejecutivos avanzados** (`/reportes`):
- Reporte de una página: resumen ejecutivo de la reestructuración
- Mapa de calor de cargas laborales (dependencia × nivel)
- Reporte para DAFP (formato específico)
- Reporte para Comisión de Personal

**9.2 Versionamiento de documentos**:
- Agregar campo `version` al modelo Document
- Vista de historial de versiones por documento

**9.3 Import SIGEP II**:
- Parser de archivo plano de SIGEP para poblar Employee
- Mapeo de campos SIGEP → modelo Employee

---

## INSTRUCCIONES DE IMPLEMENTACIÓN

1. **Cada bloque es un sprint independiente**. Implementar en orden.
2. **Backend primero**: modelos, migraciones, serializers, views, URLs.
3. **Frontend después**: página, componentes, integración con API.
4. **No romper lo existente**: cada cambio debe ser aditivo.
5. **Migrar datos existentes** cuando se modifique un modelo.
6. **Tests mínimos**: verificar que compila (tsc --noEmit) y que las migraciones corren.
7. **Commit después de cada bloque** con mensaje descriptivo.
8. **Deploy a producción** después de cada sprint.

## PRIORIDAD DE EJECUCIÓN

```
Sprint 14: Menú reorganizado + Panel de progreso        ← HACER PRIMERO
Sprint 15: Generador de Estudio Técnico completo
Sprint 16: Generador de Manual de Funciones propuesto
Sprint 17: Módulo de Indemnizaciones
Sprint 18: Equipo Técnico
Sprint 19: Plan de Implementación
Sprint 20: Notificaciones por Email
Sprint 21: Validación integral (reglas adicionales)
Sprint 22: Reportes ejecutivos + SIGEP + Versionamiento
```

## CONTEXTO TÉCNICO EXISTENTE

- **25+ apps Django** en `plataforma/backend/apps/`
- **50+ páginas frontend** en `plataforma/frontend/src/app/`
- **Patrón de aislamiento**: `EntityScopedMixin` y `RestructuringScopedMixin` en views
- **Auditoría**: `AuditedModel` mixin para trazabilidad
- **RBAC**: `GroupModelPermission` para permisos por grupo/modelo
- **Export**: `ExportBar` componente + `export_response()` backend
- **Niveles de dependencia**: DESPACHO, SECRETARIA, DIRECCION, SUBDIRECCION, OFICINA, GRUPO, AREA
- **Workflow**: 12 estados con precondiciones en `apps/core/workflow.py`
- **Encuestas**: portal público sin auth en `/encuesta/{token}`
- **Contratistas**: análisis de desnaturalización con KPIs
- **Brechas**: semáforo por dependencia/nivel cruzando cargas + planta + contratistas
- **Selector de contexto**: `/seleccionar-contexto` obligatorio post-login (entidad + reestructuración)

## NORMATIVA CLAVE A RESPETAR

- Ley 489/1998: organización administrativa
- Ley 909/2004: empleo público
- Ley 790/2002: retén social (7 tipos de protección)
- CPACA Ley 1437/2011: procedimiento administrativo
- Ley 617/2000: límites gasto territorial
- Ley 358/1997: capacidad endeudamiento
- Ley 819/2003: MFMP
- Dec. 785/2005: nomenclatura territorial
- Dec. 2489/2006: nomenclatura nacional
- Dec. 1083/2015: decreto único función pública
- Sentencias T-014/07, T-078/09, CE 0402-08: estabilidad laboral y retén social
- Instructivo FP 24/04/2024: metodología cargas de trabajo (Anexo 5)
- Cartilla FP mayo 2018: guía de diseño/rediseño institucional
