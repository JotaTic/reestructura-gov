# Sprint 3 — Insumos Reales (M12+, M8+, M18, Documental)

**Objetivo:** Implementar los cuatro módulos de insumos necesarios para alimentar
el análisis de reestructuración con datos reales: manual de funciones vigente,
manual de procedimientos, mandatos legales y gestión documental.

---

## Sub-módulos implementados

### 3.1 — `apps.manual_legacy` — Manual de Funciones Vigente

**Propósito:** Cargar el manual de funciones actual de la entidad (previo a la
reestructuración) para compararlo con la planta propuesta.

#### Modelos

| Modelo | Propósito |
|---|---|
| `LegacyManual` | Cabecera del manual. `unique_together (entity, name)`. |
| `LegacyManualRole` | Un cargo en el manual vigente con nivel, código, grado, denominación. |
| `LegacyManualFunction` | Una función esencial del cargo. |

Todos heredan `AuditedModel`. Registrado en AUDIT_MODELS: `manual_legacy.LegacyManual`.

#### Endpoints

| Ruta | Descripción |
|---|---|
| `GET/POST /api/manuales-vigentes/` | CRUD de manuales por entidad activa. |
| `POST /api/manuales-vigentes/{id}/importar-docx/` | Importa DOCX y detecta cargos. |
| `POST /api/manuales-vigentes/{id}/importar-pdf/` | PDF pendiente (devuelve warning). |
| `GET /api/manuales-vigentes/comparar/` | Diff manual vs planta propuesta (`?restructuring=`). |
| `GET/POST /api/manual-vigente-cargos/` | CRUD de cargos (filtrable `?manual=`). |
| `GET/POST /api/manual-vigente-funciones/` | CRUD de funciones (filtrable `?role=`). |

#### Services

- `parse_manual_docx(file, manual)`: parser heurístico DOCX. Detecta encabezados
  "IDENTIFICACION DEL EMPLEO", "PROPOSITO PRINCIPAL", "FUNCIONES ESENCIALES",
  "REQUISITOS". Fallback a primera tabla si no hay encabezados.
- `parse_manual_pdf(file, manual)`: devuelve `{'warnings': ['Parser PDF pendiente...']}`.
- `compare_current_vs_proposed(entity, restructuring)`: diff por (código, grado) o
  denominación normalizada. Devuelve `{added, removed, modified, unchanged, stats}`.

---

### 3.2 — `apps.procedimientos` — Manual de Procedimientos

**Propósito:** Cargar procedimientos por proceso del mapa. Los pasos se vinculan
a `WorkloadEntry` para derivar cargas automáticamente.

#### Modelos

| Modelo | Propósito |
|---|---|
| `Procedure` | Procedimiento asociado a un proceso. `unique_together (process, code, version)`. |
| `ProcedureStep` | Un paso con tiempo estimado, responsable, documentos y sistema. |

Registrado en AUDIT_MODELS: `procedimientos.Procedure`.

#### Cambio en `apps.cargas`

- `WorkloadEntry.procedure_step = FK(ProcedureStep, null=True, SET_NULL)`.
  Migración: `cargas/migrations/0004_workloadentry_procedure_step.py`.

#### Endpoints

| Ruta | Descripción |
|---|---|
| `GET/POST /api/procedimientos/` | CRUD de procedimientos (scope restructuring). |
| `POST /api/procedimientos/importar-docx/` | Importa DOCX de procedimiento. |
| `GET /api/procedimientos/derivar-cargas/` | Propone entradas de cargas (`?process_map=`). |
| `GET/POST /api/procedimientos-pasos/` | CRUD de pasos (filtrable `?procedure=`). |

#### Services

- `parse_procedure_docx(file, process_id)`: detecta título, metadatos y tabla
  de pasos. Parsea tiempos ('15 min', '1 hora', '30') a minutos enteros.
- `derive_workload_from_procedures(process_map)`: propone dicts de `WorkloadEntry`
  sin persistir. El usuario confirma en el frontend.

---

### 3.3 — `apps.mandatos` — Mandatos Legales

**Propósito:** Registrar funciones mandatadas por norma y verificar cobertura
mediante el reporte de brecha.

#### Modelos

| Modelo | Propósito |
|---|---|
| `LegalMandate` | Mandato normativo por entidad (norm, article, kind, is_constitutional). |
| `MandateCompliance` | Vínculo mandato-proceso con cobertura FULL/PARTIAL/NONE. `unique_together (mandate, process)`. |

Registrado en AUDIT_MODELS: `mandatos.LegalMandate`.

#### Endpoints

| Ruta | Descripción |
|---|---|
| `GET/POST /api/mandatos/` | CRUD de mandatos (scope entidad). Búsqueda por norm/mandate_text. |
| `GET /api/mandatos/brecha/` | Reporte de brecha mandatos-procesos. |
| `GET/POST /api/mandato-cumplimiento/` | CRUD de cumplimientos (filtrable `?mandate=`, `?process=`). |

#### Services

- `gap_report(entity)`: devuelve mandatos sin proceso, procesos sin mandato (del último ProcessMap)
  y estadísticas de cobertura (full/partial/none/untracked).

---

### 3.4 — `apps.documentos` — Gestión Documental

**Propósito:** Adjuntar archivos a cualquier objeto de la plataforma mediante
GenericForeignKey.

#### Modelo

- `Document`: entity, restructuring, content_type + object_id (GFK), title, kind, file
  (FileField `documents/%Y/%m/`), mime, size, notes, extracted_text (OCR opcional).
- `clean()` valida tamaño máximo 25 MB.

12 tipos de documento: ACTO_ESTRUCTURA, ACTO_PLANTA, MANUAL_VIGENTE, PROCEDIMIENTO,
HOJA_DE_VIDA, OFICIO_DAFP, CONCEPTO_DAFP, CONCEPTO_MINHACIENDA, SENTENCIA, PRESUPUESTO,
MFMP_HISTORICO, OTRO.

Registrado en AUDIT_MODELS: `documentos.Document`.

#### Settings añadidos

```python
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'
```

URLs en `config/urls.py` incluyen `static(MEDIA_URL, ...)` para desarrollo.

#### Endpoints

| Ruta | Descripción |
|---|---|
| `GET/POST /api/documentos/` | CRUD con MultiPartParser+FormParser. Scope entidad. |

#### Services

- `save_document(entity, restructuring, target_model, target_id, kind, title, file, notes)`.
- `list_documents_for(target)` → QuerySet filtrado por content_type + object_id.
- `extract_text_if_ocr_enabled(document)` → OCR opcional (pytesseract, `OCR_ENABLED=1`).

---

## Migraciones generadas

| App | Migración |
|---|---|
| `manual_legacy` | `0001_initial.py` |
| `procedimientos` | `0001_initial.py` |
| `mandatos` | `0001_initial.py` |
| `documentos` | `0001_initial.py` |
| `cargas` | `0004_workloadentry_procedure_step.py` |

---

## Frontend (Next.js 14)

| Archivo | Descripción |
|---|---|
| `src/app/manual-vigente/page.tsx` | Listado + botón Importar DOCX (modal) + reporte. |
| `src/app/manual-vigente/[id]/page.tsx` | Detalle con cargos expandibles y funciones. |
| `src/app/manual-vigente/comparar/page.tsx` | Comparativa manual vs propuesta en 3 columnas. |
| `src/app/procedimientos/page.tsx` | Listado por proceso + wizard importación DOCX. |
| `src/app/procedimientos/[id]/page.tsx` | Detalle con pasos editables. |
| `src/app/mandatos/page.tsx` | Listado + modal Reporte de Brecha. |
| `src/components/ui/DocumentList.tsx` | Componente reutilizable upload/listado documentos. |
| `src/components/layout/Sidebar.tsx` | Añadidos Manual vigente (M12+), Procedimientos, Mandatos (M18). |
| `src/types/index.ts` | LegacyManual, LegacyManualRole, LegacyManualFunction, ManualCompareReport, Procedure, ProcedureStep, LegalMandate, MandateCompliance, MandateGapReport, DocumentKind, DocumentItem. |
| `src/lib/api.ts` | Añadido `api.postForm(path, formData)` para uploads multipart. |

---

## Tests (79 tests, 100% OK)

| App | Tests | Clase |
|---|---|---|
| `manual_legacy` | 10 | ParseManualDocxTest, CompareCurrentVsProposedTest |
| `procedimientos` | 8 | ParseProcedureDocxTest, DeriveWorkloadFromProceduresTest |
| `mandatos` | 7 | GapReportTest |
| `documentos` | 4 | SaveDocumentTest, ListDocumentsForTest, DocumentSizeValidationTest |

---

## Puertas de calidad ejecutadas

| Puerta | Resultado |
|---|---|
| `makemigrations` | 5 migraciones generadas |
| `migrate` | OK |
| `makemigrations --dry-run` | **No changes detected** |
| `check` | **0 issues** |
| `test` (79 tests) | **79/79 OK** |
| `npm run typecheck` | **sin errores** |
| `seed_permissions --force` | OK — 384 celdas (48 modelos × 8 grupos) |
| `loaddata seed_jota.json` | OK — 71 objetos (5 intents nuevos pks 66–70) |

---

## Decisiones técnicas

- **pypdf NO instalado en Sprint 3**: `parse_manual_pdf` devuelve warning claro sin lanzar
  excepción. Si en sprints posteriores se requiere PDF, instalar `pypdf==4.3.1` y extraer
  texto con `PdfReader(file).pages[n].extract_text()` para reutilizar la lógica de
  `parse_manual_docx`. Añadir a `requirements.txt`.

- **OCR opcional**: `pytesseract` no es dependencia obligatoria. Se activa solo con
  `OCR_ENABLED=1` y pytesseract instalado en el sistema. El campo `extracted_text` ya existe
  en la migración, listo para cuando se active.

- **ProcedureViewSet scope**: usa `entity_field='process__process_map__entity'` y
  `restructuring_field='process__process_map__restructuring'`. `perform_create` no inyecta
  entity/restructuring porque se resuelven vía el FK a `process`.

- **Serialización FileField en audit**: corregido `_serialize` en `apps/common/signals.py`
  para convertir `FieldFile` a `str` antes de serializar a JSON. Afecta a todos los modelos
  con FileField registrados en AUDIT_MODELS.

- **api.postForm**: añadido a `src/lib/api.ts` para soportar uploads multipart desde el
  frontend. No envía `Content-Type` manual — el browser lo setea con boundary automático.

---

## Pendientes conocidos

- **Parser PDF**: pendiente instalación y configuración de pypdf para Sprint posterior.
- **Frontend CRUD mandato-cumplimiento**: la página de mandatos permite crear mandatos pero
  no gestionar los cumplimientos (vincular proceso + cobertura). Pendiente para Sprint 4.
- **Derivar cargas UI**: el wizard de importación de procedimientos muestra el resultado
  pero no tiene flujo de confirmación visual para guardar las entradas en la matriz.
- **OCR**: `extract_text_if_ocr_enabled` requiere instalación de Tesseract y pytesseract
  en el servidor. Documentado como pendiente operacional.
- **Tamaño máximo archivo**: `clean()` valida 25 MB pero el servidor web (nginx/gunicorn)
  debe configurarse con `client_max_body_size 26m` en producción.
