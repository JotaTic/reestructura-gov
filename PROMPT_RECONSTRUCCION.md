# PROMPT DE RECONSTRUCCION - ReEstructura.Gov (Reestructuracion Institucional)

## Descripcion General
Plataforma web para reestructuracion institucional de entidades publicas colombianas. Sigue la metodologia de la Funcion Publica (DAFP) y la Cartilla de Reestructuracion. Maquina de estados con 12 fases. Desplegado en produccion en DigitalOcean.

## Stack Tecnologico
- **Backend**: Django 5.0.6 + DRF 3.15.2 + django-filter + drf-spectacular (OpenAPI)
- **Frontend**: Next.js (React)
- **Base de datos**: PostgreSQL 16
- **Servidor**: Gunicorn + Nginx + Systemd
- **SSL**: Let's Encrypt (Certbot auto-redirect)
- **Documentos**: python-docx, openpyxl, ReportLab (PDF)
- **Docker**: PostgreSQL 16-alpine + Django backend (8000) + Next.js frontend (3000)
- **Dominio**: reestructuracion.corpofuturo.org
- **Servidor**: DigitalOcean droplet 64.23.248.47

## Deployment
- SSH: root@64.23.248.47 (key: ~/.ssh/id_ed25519_reestructura)
- Deploy script automatizado 11 pasos: swap, dependencias, clone/update, backend (venv, requirements, migrations, seeds), frontend (npm install, build, .env.production), systemd services, nginx reverse proxy, SSL certbot
- Login produccion: admin / admin123

## Estructura del Proyecto
```
Reestructuracion/
├── plataforma/
│   ├── backend/           → Django 5.0.6
│   │   ├── config/        → Settings Django
│   │   ├── apps/          → 25 apps Django
│   │   ├── manage.py
│   │   └── requirements.txt
│   ├── frontend/          → Next.js
│   ├── docker-compose.yml
│   └── docs/              → sprint_0.md a sprint_6.md + roadmap
├── deploy.sh              → Script deployment automatizado
├── CLAUDE.md
└── (PDFs y documentos regulatorios)
```

## Apps Django (25 apps)

### 1. core/ — Modelo base (Tenant y Estructura Org)
- **Entity**: Entidad publica (Order, MunicipalityCategory, LegalNature)
- **Restructuring**: Ejercicio contenedor con 12 estados de avance
- **TimelineActivity**: Agenda Fase 1 (Anexo 1 Cartilla FP)
- **Department**: Unidades organizacionales
- **UserEntityAccess**: Multi-tenant RBAC estricto
- **GroupModelPermission**: Matriz CRUD por (grupo, modelo)
- **RestructuringObjective**: 16 tipos de objetivo (fortalecimiento institucional, nivelacion salarial, etc.)

### 2. actos/ — Generador de Actos Administrativos
- **ActTemplate**: Plantillas reutilizables para actos oficiales
- **ActDraft**: Borradores vinculados a entidades (cumplimiento CPACA)
- ActKind, ActTopic, ActScope (enums)

### 3. cargas/ — Matriz de Cargas de Trabajo (Anexo 5 Funcion Publica)
- **WorkloadMatrix**: Contenedor de estudios de cargas
- **WorkloadEntry**: Actividad medida individual (columnas 1-14)
- **ManualFuncionesOverride**: Sobreescritura manual de funciones auto-generadas
- Formula: TE = [(Tmin + 4*TU + Tmax) / 6] x 1.07

### 4. common/ — Modelos Compartidos
- **ChangeLog**: Auditoria inmutable con snapshots JSON (CREATE, UPDATE, DELETE)

### 5. consultas/ — Consultas Oficiales (Fase 1)
- **OfficialConsultation**: Consultas formales a DAFP, MinHacienda, etc.
- Resultado: PENDIENTE, FAVORABLE, NO_FAVORABLE, CON_OBSERVACIONES
- Tracking automatico de vencimiento 30 dias

### 6. diagnostico/ — Fase Diagnostica (Fase 2)
- **Diagnosis**: Contenedor de diagnostico por entidad
- **SwotItem**: Analisis DOFA (5 dimensiones: directiva, competitiva, tecnica, tecnologica, talento)
- **LegalReference**: Marco legal correlacionado
- **EnvironmentAnalysis**: Analisis economico, politico, social, tecnologico, cultural

### 7. documentos/ — Gestion Documental
- **Document**: GenericForeignKey a cualquier objeto (archivos, OCR)
- **DocumentKind**: 12 tipos (actos, manuales, conceptos DAFP, sentencias, presupuestos, etc.)
- MAX_FILE_SIZE: 25 MB

### 8. financiero/ — Analisis Financiero
- **FiscalYear**: Historico 4 anos + proyeccion
- Properties: law_617_ratio, law_617_compliant, solvency_ratio, sustainability_ratio
- Cumplimiento Ley 617/2000 y Ley 358/1997

### 9. jota/ — Chatbot Deterministico (sin IA)
- **JotaSettings**: Configuracion singleton (nombre bot, cargo, colores)
- **JotaIntent**: Q&A con keywords, prioridad, categoria
- Motor de matching por palabras clave, sin servicios externos

### 10. legal/ — Base de Conocimiento Legal
- **LegalNorm**: Catalogo de leyes, decretos, sentencias
- Tipos: CONSTITUCION, LEY, DECRETO, RESOLUCION, SENTENCIA_CC, SENTENCIA_CE, CONPES, OTRO

### 11. mandatos/ — Mandatos Legales y Cumplimiento
- **LegalMandate**: Funciones mandatadas por ley
- **MandateCompliance**: Vinculo mandatos-procesos
- CoverageLevel: FULL, PARTIAL, NONE

### 12. manual_legacy/ — Manual Actual (Pre-reestructuracion)
- **LegacyManual**: Contenedor de importacion de manual existente
- **LegacyManualRole**: Descripciones de cargo del manual actual
- **LegacyManualFunction**: Funciones esenciales por cargo
- Importado desde DOCX/PDF, comparado con nomina propuesta

### 13. mfmp/ — Marco Fiscal de Mediano Plazo (Ley 819/2003)
- **MFMP**: Contenedor proyeccion 10 anos
- **MFMPIncomeProjection**: Por concepto (tributarios, SGP, regalias, etc.)
- **MFMPExpenseProjection**: Por concepto (funcionamiento personal, inversion, etc.)
- **MFMPDebtProjection**: Deuda vigente y servicio de deuda
- **MFMPScenario**: Escenarios override con deltas

### 14. nomenclatura/ — Catalogo de Nomenclatura de Cargos
- **JobNomenclature**: Titulos oficiales (Dec. 785/2005 territorial, Dec. 2489/2006 nacional)
- HierarchyLevel: DIRECTIVO, ASESOR, PROFESIONAL, TECNICO, ASISTENCIAL

### 15. nomina/ — Configuracion Salarial
- **SalaryScale**: Escalas salariales de referencia por orden, ano, nivel
- **PrestationalFactor**: Factor prestacional por regimen (territorial, nacional, trabajador oficial)
- **EntitySalaryConfig**: Regimen salarial especifico por entidad

### 16. notificaciones/ — Notificaciones
- **Notification**: Notificaciones por usuario
- Tipos: TRANSITION, VALIDATION_ERROR, CONSULTATION_DUE, DOCUMENT_NEW, ASSIGNMENT, SYSTEM

### 17. participacion/ — Comite de Personal y Sindicatos
- **PersonnelCommittee**: Comision de personal (Ley 909/2004)
- **CommitteeMember**: Miembros (representantes empleados y entidad)
- **CommitteeMeeting**: Actas de reunion
- **UnionCommunication**: Comunicaciones con sindicatos

### 18. planta/ — Plan de Nomina (Actual vs Propuesta)
- **PayrollPlan**: Planta global o estructural (CURRENT o PROPOSED)
- **PayrollPosition**: Cargo individual (cantidad, salario, ocupante)
- Properties: total_monthly, total_annual

### 19. procedimientos/ — Procedimientos y Pasos
- **Procedure**: Asociado a procesos (control de versiones)
- **ProcedureStep**: Pasos con tiempo estimado, volumen mensual, docs entrada/salida
- Vinculacion a WorkloadEntry para matriz de cargas

### 20. procesos/ — Mapas de Procesos y Cadena de Valor
- **ProcessMap**: Mapa actual o propuesto (Fase 3.4)
- **Process**: Clasificacion (ESTRATEGICO, MISIONAL, APOYO, EVALUACION)
- Prioridad: required, executable_by_entity, duplicated
- **ValueChainLink**: INPUT → PROCESS → OUTPUT → OUTCOME → IMPACT

### 21. reten/ — Reten Social (Ley 790/2002)
- **ProtectedEmployee**: Proteccion especial durante supresion de cargos
- Tipos: MADRE_CABEZA, PADRE_CABEZA, DISCAPACIDAD, PRE_PENSIONADO, EMBARAZO, LACTANCIA, FUERO_SINDICAL
- Jurisprudencia: T-014/07, T-078/09, CE 25000-23-25-000-2001-07679-02

### 22. simulador/ — Simulador de Escenarios
- **Scenario**: Variantes clonables de planes de nomina
- is_baseline: Solo uno por reestructuracion
- cached_metrics: Cache JSON de metricas (invalidado al cambiar plan)

### 23. talento/ — Registros de Talento Humano
- **Employee**: Perfil completo (tipo ID, fecha nacimiento, % discapacidad, cabeza de hogar)
- **EmployeeEducation**: Historial academico (PRIMARIA a DOCTORADO)
- **EmployeeExperience**: Historial laboral (sector, fechas, is_current)
- **EmployeeTraining**: Cursos completados
- **EmployeeEvaluation**: Evaluacion anual (SOBRESALIENTE, SATISFACTORIO, NO_SATISFACTORIO)
- **EmploymentRecord**: Tipo vinculacion (carrera, LNR, provisional, temporal, etc.)

### 24. analisis/ — (Modulo de analisis)

### 25. Otros modulos auxiliares

## Estado del Proyecto
- **Sprints 0-12 completados**
- **11 items pendientes (baja prioridad)**: Password change on first login, SIGEP imports, FUT parser, PDF manual parsing, frontend eligibility editing, Celery bulk ops, Dec. 2489/2006 eligibility, digital signature, real-time validation, WebSocket notifications, CONSULTATION_DUE signal

## Feedback de Deploy
- SSL/HTTPS obligatorio — deploy.sh corre certbot automaticamente
- NEXT_PUBLIC_API_URL siempre https://, nunca http://
- Cookies Secure correlacionado con SSL
- CORS y CSRF_TRUSTED_ORIGINS con protocolo correcto
- Verificacion post-deploy con test real de login POST (no solo GET status)

## Reglas de Autonomia
- NO presentar opciones: tomar decisiones directamente
- 2 caminos → elegir el primero (mas simple)
- 3 caminos → elegir el segundo (equilibrado)
- Solo preguntar por decisiones irreversibles o alto riesgo
