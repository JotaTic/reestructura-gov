export type HierarchyLevel =
  | "DIRECTIVO"
  | "ASESOR"
  | "PROFESIONAL"
  | "TECNICO"
  | "ASISTENCIAL";

export interface Entity {
  id: number;
  name: string;
  acronym: string;
  order: "NACIONAL" | "DEPARTAMENTAL" | "DISTRITAL" | "MUNICIPAL";
  order_display: string;
  municipality_category: string;
  legal_nature: string;
  legal_nature_display: string;
  creation_norm: string;
  nit: string;
  nomenclature_decree: string;
  departments_count: number;
  // Insumos vigentes (num. 1.1)
  current_structure_act: string;
  current_payroll_act: string;
  current_manual_act: string;
  // Acuerdo inicial (num. 1.2)
  problem_statement: string;
  objectives: string;
  approach: string;
  risks: string;
  created_at: string;
  updated_at: string;
}

export type TimelineStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED";

export interface TimelineActivity {
  id: number;
  entity: number;
  name: string;
  responsible: string;
  indicator: string;
  start_date: string | null;
  end_date: string | null;
  status: TimelineStatus;
  status_display: string;
  order: number;
  notes: string;
}

export type RestructuringStatus =
  | "BORRADOR"
  | "DIAGNOSTICO_COMPLETO"
  | "ANALISIS_COMPLETO"
  | "REVISION_JURIDICA"
  | "REVISION_FINANCIERA"
  | "CONCEPTO_DAFP_SOLICITADO"
  | "CONCEPTO_DAFP_RECIBIDO"
  | "COMISION_PERSONAL_INFORMADA"
  | "APROBADO"
  | "ACTO_EXPEDIDO"
  | "IMPLEMENTADO"
  | "ARCHIVADO";

// Sprint 5 — Gobierno

export interface WorkflowTransition {
  from_status: RestructuringStatus;
  to_status: RestructuringStatus;
  name: string;
  responsible_group: string;
  description: string;
  blocked_by: string[];
}

export type ConsultationTarget =
  | "DAFP"
  | "MINHACIENDA"
  | "MINTRABAJO"
  | "CNSC"
  | "CONTRALORIA"
  | "PERSONERIA"
  | "OTRO";

export type ConsultationResult =
  | "PENDIENTE"
  | "FAVORABLE"
  | "NO_FAVORABLE"
  | "CON_OBSERVACIONES";

export interface OfficialConsultation {
  id: number;
  restructuring: number;
  entity_target: ConsultationTarget;
  entity_target_display: string;
  subject: string;
  sent_at: string | null;
  reference_number: string;
  response_at: string | null;
  response_result: ConsultationResult;
  response_result_display: string;
  response_document: number | null;
  notes: string;
  days_until_expiration: number | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface PersonnelCommitteeMember {
  name: string;
  role: string;
  since: string;
}

export interface PersonnelCommittee {
  id: number;
  entity: number;
  entity_name: string;
  name: string;
  members_json: PersonnelCommitteeMember[];
  meetings_count: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface CommitteeMeeting {
  id: number;
  committee: number;
  committee_name: string;
  restructuring: number | null;
  date: string;
  agenda: string;
  minutes_text: string;
  minutes_document: number | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface UnionCommunication {
  id: number;
  restructuring: number;
  union_name: string;
  sent_at: string;
  subject: string;
  body: string;
  document: number | null;
  response_received: boolean;
  response_notes: string;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface Restructuring {
  id: number;
  entity: number;
  entity_name: string;
  name: string;
  code: string;
  reference_date: string;
  status: RestructuringStatus;
  status_display: string;
  current_status_since: string | null;
  description: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface JotaConfig {
  is_enabled: boolean;
  bot_name: string;
  welcome_message: string;
  fallback_message: string;
  suggested_questions: string[];
  position: "bottom-right" | "bottom-left";
  primary_color: string;
}

export interface JotaAnswer {
  answer: string;
  matched_intent: string | null;
}

export interface JotaMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: number;
  matchedIntent?: string | null;
}

export interface SessionUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  groups: string[];
}

export interface Department {
  id: number;
  entity: number;
  name: string;
  code: string;
  parent: number | null;
  order: number;
}

export interface JobNomenclature {
  id: number;
  scope: "NACIONAL" | "TERRITORIAL";
  scope_display: string;
  level: HierarchyLevel;
  level_display: string;
  code: string;
  denomination: string;
}

export interface WorkloadMatrix {
  id: number;
  entity: number;
  entity_name: string;
  name: string;
  reference_date: string;
  notes: string;
  entries_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkloadEntry {
  id?: number;
  matrix: number;
  department: number;
  department_name?: string;
  process: string;
  activity: string;
  procedure: string;
  hierarchy_level: Exclude<HierarchyLevel, "DIRECTIVO">;
  hierarchy_level_display?: string;
  requirements: string;
  job_denomination: string;
  job_code: string;
  job_grade: string;
  main_purpose: string;
  monthly_frequency: number | string;
  t_min: number | string;
  t_usual: number | string;
  t_max: number | string;
  standard_time?: number | string;
  hh_month?: number | string;
}

export interface ConsolidationDept {
  department_id: number;
  department_name: string;
  hours_by_level: Record<string, number>;
  positions_by_level: Record<string, number>;
  total_positions: number;
}

export interface ConsolidationResult {
  matrix_id: number;
  matrix_name: string;
  entity: string;
  departments: ConsolidationDept[];
  totals: {
    hours_by_level: Record<string, number>;
    positions_by_level: Record<string, number>;
    total_positions: number;
  };
}

export type PayrollKind = "CURRENT" | "PROPOSED";
export type PayrollStructure = "GLOBAL" | "STRUCTURAL";

export interface PayrollPlan {
  id: number;
  entity: number;
  entity_name: string;
  kind: PayrollKind;
  kind_display: string;
  structure: PayrollStructure;
  structure_display: string;
  name: string;
  reference_date: string;
  adopted_by: string;
  notes: string;
  positions_count: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollPosition {
  id?: number;
  plan: number;
  department: number | null;
  department_name?: string | null;
  hierarchy_level: HierarchyLevel;
  hierarchy_level_display?: string;
  denomination: string;
  code: string;
  grade: string;
  quantity: number;
  monthly_salary: number | string;
  total_monthly?: number | string;
  total_annual?: number | string;
  notes: string;
}

export interface PayrollCompareRow {
  hierarchy_level: HierarchyLevel;
  code: string;
  grade: string;
  denomination: string;
  unit_salary: number;
  current_quantity: number;
  proposed_quantity: number;
  delta_quantity: number;
  current_monthly: number;
  proposed_monthly: number;
  delta_monthly: number;
}

export interface PayrollCompareSummary {
  plan_id: number;
  name: string;
  kind: PayrollKind;
  reference_date: string;
  total_positions: number;
  total_monthly: number;
  total_annual: number;
  by_level: Record<string, { positions: number; monthly: number }>;
}

export interface PayrollComparison {
  entity_id: number;
  current: PayrollCompareSummary;
  proposed: PayrollCompareSummary;
  delta: { positions: number; monthly: number; annual: number };
  rows: PayrollCompareRow[];
}

// ---- Módulo 5 — Base legal ----

export type LegalKind =
  | "CONSTITUCION"
  | "LEY"
  | "DECRETO"
  | "RESOLUCION"
  | "SENTENCIA_CC"
  | "SENTENCIA_CE"
  | "CONPES"
  | "OTRO";

export interface LegalNorm {
  id: number;
  kind: LegalKind;
  kind_display: string;
  reference: string;
  title: string;
  year: number;
  summary: string;
  key_articles: string;
  applies_to: string;
  url: string;
}

// ---- Módulo 7 — Financiero ----

export interface FiscalYear {
  id: number;
  entity: number;
  entity_name: string;
  year: number;
  current_income: number | string;
  operating_expenses: number | string;
  personnel_expenses: number | string;
  law_617_limit_pct: number | string;
  debt_service: number | string;
  total_debt: number | string;
  law_617_ratio: number | string;
  law_617_compliant: boolean;
  solvency_ratio: number | string;
  sustainability_ratio: number | string;
  notes: string;
}

// ---- Módulo 12 — Manual de funciones (agregación) ----

export interface FunctionsManualJob {
  job_denomination: string;
  job_code: string;
  job_grade: string;
  hierarchy_level: string;
  main_purpose: string;
  requirements: string;
  functions: string[];
  departments: string[];
  positions_required: number;
}

export interface FunctionsManual {
  matrix_id: number;
  matrix_name: string;
  entity: string;
  nomenclature_decree: string;
  jobs: FunctionsManualJob[];
}

// ---- Módulo 13 — Retén social ----

export type ProtectionType =
  | "MADRE_CABEZA"
  | "PADRE_CABEZA"
  | "DISCAPACIDAD"
  | "PRE_PENSIONADO"
  | "EMBARAZO"
  | "LACTANCIA"
  | "FUERO_SINDICAL";

export interface ProtectedEmployee {
  id?: number;
  entity: number;
  entity_name?: string;
  full_name: string;
  id_type: string;
  id_number: string;
  job_denomination: string;
  department: string;
  protection_type: ProtectionType;
  protection_type_display?: string;
  protection_start: string | null;
  protection_end: string | null;
  evidence: string;
  active: boolean;
  notes: string;
}

// ---- Módulo 14 — Actos Administrativos ----

export type ActKind = "DECRETO" | "ORDENANZA" | "ACUERDO" | "RESOLUCION" | "ESTATUTOS";
export type ActScope = "NACIONAL" | "DEPARTAMENTAL" | "MUNICIPAL" | "DESCENTRALIZADO";
export type ActTopic =
  | "ESTRUCTURA"
  | "PLANTA"
  | "MANUAL"
  | "SALARIAL"
  | "SUPRESION"
  | "LIQUIDACION";
export type ActStatus = "DRAFT" | "REVIEW" | "ISSUED" | "ARCHIVED";

export interface ActTemplate {
  id: number;
  kind: ActKind;
  kind_display: string;
  scope: ActScope;
  scope_display: string;
  topic: ActTopic;
  topic_display: string;
  name: string;
  description: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActDraft {
  id: number;
  entity: number;
  entity_name: string;
  template: number | null;
  template_name: string | null;
  title: string;
  kind: ActKind;
  kind_display: string;
  topic: ActTopic;
  topic_display: string;
  content: string;
  status: ActStatus;
  status_display: string;
  act_number: string;
  issue_date: string | null;
  signed_by: string;
  created_at: string;
  updated_at: string;
}

// ---- Módulo 8 — Procesos & Cadena de Valor ----

export type ProcessMapKind = "CURRENT" | "PROPOSED";
export type ProcessType = "ESTRATEGICO" | "MISIONAL" | "APOYO" | "EVALUACION";
export type ValueChainStage = "INPUT" | "PROCESS" | "OUTPUT" | "OUTCOME" | "IMPACT";

export interface ProcessMap {
  id: number;
  entity: number;
  entity_name: string;
  kind: ProcessMapKind;
  kind_display: string;
  name: string;
  reference_date: string;
  notes: string;
  processes_count: number;
  chain_count: number;
  created_at: string;
  updated_at: string;
}

export interface Process {
  id?: number;
  process_map: number;
  code: string;
  name: string;
  type: ProcessType;
  type_display?: string;
  description: string;
  required: boolean;
  executable_by_entity: boolean;
  duplicated: boolean;
  order: number;
}

export interface ValueChainLink {
  id?: number;
  process_map: number;
  stage: ValueChainStage;
  stage_display?: string;
  description: string;
  related_process: number | null;
  order: number;
}

// ---- Módulo 6 — Diagnóstico ----

export type SwotType = "F" | "D" | "O" | "A";
export type SwotDimension =
  | "DIRECTIVA"
  | "COMPETITIVA"
  | "TECNICA"
  | "TECNOLOGICA"
  | "TH";
export type EnvDimension =
  | "ECONOMICO"
  | "POLITICO"
  | "SOCIAL"
  | "TECNOLOGICO"
  | "CULTURAL"
  | "OTRO";

export interface Diagnosis {
  id: number;
  entity: number;
  entity_name: string;
  name: string;
  reference_date: string;
  mission: string;
  vision: string;
  functions_analysis: string;
  duplications: string;
  notes: string;
  swot_count: number;
  legal_count: number;
  env_count: number;
  created_at: string;
  updated_at: string;
}

export interface SwotItem {
  id?: number;
  diagnosis: number;
  type: SwotType;
  type_display?: string;
  dimension: SwotDimension;
  dimension_display?: string;
  description: string;
  priority: 1 | 2 | 3;
  order: number;
}

export interface LegalReference {
  id?: number;
  diagnosis: number;
  norm: string;
  article: string;
  topic: string;
  correlated_decision: string;
  order: number;
}

export interface EnvironmentAnalysis {
  id?: number;
  diagnosis: number;
  dimension: EnvDimension;
  dimension_display?: string;
  description: string;
  impact: -1 | 0 | 1;
  impact_display?: string;
  order: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---- Sprint 0 — Superadmin ----

export interface AdminUserEntityAccess {
  id: number;
  entity: number;
  entity_name: string;
  is_default: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups: number[];
  group_names: string[];
  entity_access: AdminUserEntityAccess[];
  temporary_password?: string;
}

export interface AdminGroup {
  id: number;
  name: string;
}

export interface MatrixCell {
  group_id: number;
  group_name: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface MatrixRow {
  app_label: string;
  model: string;
  verbose_name: string;
  cells: MatrixCell[];
}

export interface MatrixResponse {
  groups: AdminGroup[];
  models: MatrixRow[];
}

// ---- Sprint 1 — Objetivos de reestructuración ----

export type ObjectiveKind =
  | "FORTALECIMIENTO_INSTITUCIONAL"
  | "NIVELACION_SALARIAL"
  | "RECLASIFICACION_EMPLEOS"
  | "CREACION_DEPENDENCIA"
  | "SUPRESION_DEPENDENCIA"
  | "SUPRESION_EMPLEOS"
  | "LIQUIDACION_ENTIDAD"
  | "FUSION_ENTIDADES"
  | "ESCISION_ENTIDAD"
  | "MODERNIZACION_TECNOLOGICA"
  | "CUMPLIMIENTO_COMPETENCIAS"
  | "AJUSTE_ORDEN_JUDICIAL"
  | "CUMPLIMIENTO_LEY_617"
  | "PLANTA_TRANSITORIA"
  | "PLAN_CARRERA_CNSC"
  | "AJUSTE_NOMENCLATURA";

export interface ObjectiveDefinition {
  label: string;
  required_inputs: string[];
  active_modules: string[];
  validators: string[];
  required_outputs: string[];
}

export interface RestructuringObjective {
  id: number;
  restructuring: number;
  restructuring_name?: string;
  kind: ObjectiveKind;
  kind_display: string;
  description: string;
  target_metric: string;
  target_value: string | null;
  indicator: string;
  deadline: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

// ---- Sprint 1 — M15 Hojas de vida ----

export type IdType = "CC" | "CE" | "PA" | "TI" | "RC";
export type Sex = "M" | "F" | "NB";

export interface Employee {
  id: number;
  entity: number;
  entity_name?: string;
  id_type: IdType;
  id_type_display?: string;
  id_number: string;
  full_name: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  sex: Sex;
  sex_display?: string;
  has_disability: boolean;
  disability_percentage: number | null;
  is_head_of_household: boolean;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export type EducationLevel =
  | "PRIMARIA"
  | "BACHILLERATO"
  | "TECNICO"
  | "TECNOLOGO"
  | "PREGRADO"
  | "ESPECIALIZACION"
  | "MAESTRIA"
  | "DOCTORADO";

export interface EmployeeEducation {
  id?: number;
  employee: number;
  level: EducationLevel;
  level_display?: string;
  institution: string;
  program: string;
  title: string;
  graduation_date: string | null;
  credential_number: string;
}

export type ExperienceSector = "PUBLICO" | "PRIVADO" | "MIXTO" | "INDEPENDIENTE" | "OTRO";

export interface EmployeeExperience {
  id?: number;
  employee: number;
  employer: string;
  position_name: string;
  sector: ExperienceSector;
  sector_display?: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  is_public_sector: boolean;
  functions: string;
}

export interface EmployeeTraining {
  id?: number;
  employee: number;
  topic: string;
  hours: number;
  institution: string;
  completed_at: string | null;
  cert: string;
}

export type EvaluationResult = "SOBRESALIENTE" | "SATISFACTORIO" | "NO_SATISFACTORIO";

export interface EmployeeEvaluation {
  id?: number;
  employee: number;
  year: number;
  score: string | number;
  result: EvaluationResult;
  result_display?: string;
  evaluator: string;
  at: string;
}

export type AppointmentType =
  | "CARRERA"
  | "LNR"
  | "PROVISIONAL"
  | "TEMPORAL"
  | "SUPERNUMERARIO"
  | "TRABAJADOR_OFICIAL";

export type AdminStatus =
  | "ACTIVO"
  | "VACACIONES"
  | "LICENCIA_REMUNERADA"
  | "LICENCIA_NO_REMUNERADA"
  | "COMISION_SERVICIOS"
  | "COMISION_ESTUDIO"
  | "ENCARGO"
  | "SUSPENDIDO";

export interface EmploymentRecord {
  id?: number;
  employee: number;
  position: number | null;
  entity: number;
  appointment_type: AppointmentType;
  appointment_type_display?: string;
  appointment_date: string;
  termination_date: string | null;
  termination_reason: string;
  administrative_status: AdminStatus;
  administrative_status_display?: string;
  is_active: boolean;
}

export interface EmployeeTenure {
  total_days: number;
  days_in_current_entity: number;
  total_years: number;
}

export interface RetirementEligibility {
  is_pre_pensioned: boolean;
  years_remaining: number;
  reason: string;
}

export interface EmployeeHojaDeVida {
  employee: Employee;
  education: EmployeeEducation[];
  experience: EmployeeExperience[];
  training: EmployeeTraining[];
  evaluations: EmployeeEvaluation[];
  employment_records: EmploymentRecord[];
  tenure: EmployeeTenure;
  retirement_eligibility: RetirementEligibility;
}

export type ChangeAction = "CREATE" | "UPDATE" | "DELETE";

export interface ChangeLogEntry {
  id: number;
  user: number | null;
  user_username: string | null;
  entity: number | null;
  entity_name: string | null;
  app_label: string;
  model: string;
  object_id: string;
  action: ChangeAction;
  action_display: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  at: string;
}

// ---------------------------------------------------------------------------
// M17 — MFMP (Marco Fiscal de Mediano Plazo) — Ley 819/2003
// ---------------------------------------------------------------------------

export type MFMPIncomeConcept =
  | "TRIBUTARIOS"
  | "NO_TRIBUTARIOS"
  | "TRANSFERENCIAS_SGP"
  | "TRANSFERENCIAS_OTRAS"
  | "REGALIAS"
  | "COFINANCIACION"
  | "CREDITO"
  | "RECURSOS_BALANCE"
  | "OTROS";

export type MFMPExpenseConcept =
  | "FUNCIONAMIENTO_PERSONAL"
  | "FUNCIONAMIENTO_GENERALES"
  | "FUNCIONAMIENTO_TRANSFERENCIAS"
  | "SERVICIO_DEUDA"
  | "INVERSION"
  | "OTROS";

export interface MFMP {
  id: number;
  entity: number;
  entity_name: string;
  entity_acronym: string;
  name: string;
  base_year: number;
  horizon_years: number;
  approved_by: string;
  approved_at: string | null;
  notes: string;
  totals: {
    income: Record<string, number>;
    expense: Record<string, number>;
  };
  created_at: string;
  updated_at: string;
}

export interface MFMPIncomeProjection {
  id: number;
  mfmp: number;
  year: number;
  concept: MFMPIncomeConcept;
  amount: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MFMPExpenseProjection {
  id: number;
  mfmp: number;
  year: number;
  concept: MFMPExpenseConcept;
  amount: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MFMPDebtProjection {
  id: number;
  mfmp: number;
  year: number;
  outstanding_debt: string;
  debt_service: string;
  new_disbursements: string;
  created_at: string;
  updated_at: string;
}

export interface MFMPScenario {
  id: number;
  mfmp: number;
  name: string;
  description: string;
  deltas_json: Record<string, unknown>;
  is_baseline: boolean;
  created_at: string;
  updated_at: string;
}

export interface MFMPLawByYear {
  icld?: number;
  funcionamiento?: number;
  ratio: number;
  limit?: number;
  compliant?: boolean;
  solvency_ratio?: number;
  sustainability_ratio?: number;
  status?: "VERDE" | "AMARILLO" | "ROJO";
  ahorro_operacional?: number;
  ingresos_corrientes?: number;
  debt_service?: number;
  outstanding_debt?: number;
}

export interface MFMPSimulation {
  plan_id: number;
  annual_cost: number;
  baseline: {
    law_617: Record<string, MFMPLawByYear>;
    law_358: Record<string, MFMPLawByYear>;
  };
  simulated: {
    law_617: Record<string, MFMPLawByYear>;
    law_358: Record<string, MFMPLawByYear>;
  };
  broken_years_617: number[];
  broken_years_358: number[];
}

// ---------------------------------------------------------------------------
// Sprint 3 — Manual Vigente, Procedimientos, Mandatos, Documentos
// ---------------------------------------------------------------------------

export type RoleLevel =
  | "DIRECTIVO"
  | "ASESOR"
  | "PROFESIONAL"
  | "TECNICO"
  | "ASISTENCIAL";

export interface LegacyManualFunction {
  id: number;
  role: number;
  order: number;
  description: string;
  is_essential: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegacyManualRole {
  id: number;
  manual: number;
  level: RoleLevel;
  code: string;
  grade: string;
  denomination: string;
  main_purpose: string;
  dependencies_where_applies: string;
  min_education: string;
  min_experience: string;
  order: number;
  functions: LegacyManualFunction[];
  created_at: string;
  updated_at: string;
}

export interface LegacyManual {
  id: number;
  entity: number;
  entity_name: string;
  name: string;
  act_reference: string;
  issue_date: string | null;
  source_file_name: string;
  import_report: Record<string, unknown>;
  notes: string;
  roles_count: number;
  created_at: string;
  updated_at: string;
}

export interface ManualCompareItem {
  code: string;
  grade: string;
  denomination: string;
  diff?: Record<string, { old: string; new: string }>;
}

export interface ManualCompareReport {
  added: ManualCompareItem[];
  removed: ManualCompareItem[];
  modified: ManualCompareItem[];
  unchanged: ManualCompareItem[];
  stats: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  warnings?: string[];
}

export interface ProcedureStep {
  id: number;
  procedure: number;
  order: number;
  description: string;
  role_executor: string;
  estimated_minutes: number;
  monthly_volume: number;
  input_document: string;
  output_document: string;
  supporting_system: string;
  created_at: string;
  updated_at: string;
}

export interface Procedure {
  id: number;
  process: number;
  process_name: string;
  code: string;
  name: string;
  version: string;
  objective: string;
  scope: string;
  inputs_text: string;
  outputs_text: string;
  last_updated: string | null;
  steps_count: number;
  created_at: string;
  updated_at: string;
}

export type MandateKind =
  | "EJECUCION"
  | "REGULACION"
  | "VIGILANCIA"
  | "FOMENTO"
  | "OTRO";

export type CoverageLevel = "FULL" | "PARTIAL" | "NONE";

export interface LegalMandate {
  id: number;
  entity: number;
  entity_name: string;
  norm: string;
  article: string;
  mandate_text: string;
  kind: MandateKind;
  is_constitutional: boolean;
  assigned_to_department: number | null;
  department_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MandateCompliance {
  id: number;
  mandate: number;
  mandate_norm: string;
  process: number;
  process_name: string;
  coverage: CoverageLevel;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MandateGapReport {
  mandates_without_process: Array<{
    id: number;
    norm: string;
    article: string;
    kind: MandateKind;
    mandate_text: string;
  }>;
  processes_without_mandate: Array<{
    id: number;
    code: string;
    name: string;
    type: string;
  }>;
  coverage_stats: {
    full: number;
    partial: number;
    none: number;
    untracked: number;
  };
}

export type DocumentKind =
  | "ACTO_ESTRUCTURA"
  | "ACTO_PLANTA"
  | "MANUAL_VIGENTE"
  | "PROCEDIMIENTO"
  | "HOJA_DE_VIDA"
  | "OFICIO_DAFP"
  | "CONCEPTO_DAFP"
  | "CONCEPTO_MINHACIENDA"
  | "SENTENCIA"
  | "PRESUPUESTO"
  | "MFMP_HISTORICO"
  | "OTRO";

export interface DocumentItem {
  id: number;
  entity: number;
  entity_name: string;
  restructuring: number | null;
  content_type: number | null;
  object_id: number | null;
  title: string;
  kind: DocumentKind;
  file: string;
  file_url: string | null;
  mime: string;
  size: number;
  notes: string;
  extracted_text: string;
  created_at: string;
  updated_at: string;
}

// ─── Sprint 4 — Núcleo Analítico ────────────────────────────────────────────

export type EligibilityStatus =
  | "ELEGIBLE"
  | "ELEGIBLE_POR_EQUIVALENCIA"
  | "NO_ELEGIBLE";

export interface PromotionEligibility {
  employee_id: number;
  employee_name: string;
  target_level: string;
  target_code: string;
  target_grade: string;
  status: EligibilityStatus;
  gap: string[];
  path_to_qualify: string[];
  matched_education: string | null;
  total_public_experience_years: number;
  equivalence_applied: string | null;
}

export interface EligibilityBulkResult {
  total_analyzed: number;
  eligible_direct: number;
  eligible_by_equivalence: number;
  not_eligible: number;
  results: PromotionEligibility[];
}

export interface EligibilityCostEstimate {
  employees_count: number;
  current_monthly_avg: number;
  new_monthly_avg: number;
  annual_delta: number;
  monthly_delta: number;
}

export interface ValidationFinding {
  rule_code: string;
  severity: "error" | "warning" | "info";
  message: string;
  subject: string;
  context: Record<string, unknown>;
}

export interface ValidationReport {
  restructuring_id: number;
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
  info: ValidationFinding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface RetenSyncResult {
  pre_pensioned: number;
  head_of_household: number;
  disability: number;
  total_automated: number;
  manual_preserved: number;
}

// ---------------------------------------------------------------------------
// Sprint 6 — Simulador, Dashboard, Notificaciones
// ---------------------------------------------------------------------------

export type NotificationKind =
  | "TRANSITION"
  | "VALIDATION_ERROR"
  | "CONSULTATION_DUE"
  | "DOCUMENT_NEW"
  | "ASSIGNMENT"
  | "SYSTEM";

export interface Notification {
  id: number;
  user: number;
  kind: NotificationKind;
  kind_display: string;
  entity: number | null;
  entity_name: string | null;
  restructuring: number | null;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioMetrics {
  total_positions: number;
  total_monthly_base: number;
  total_monthly_effective: number;
  total_annual: number;
  law_617_current_year: boolean | null;
  law_617_years_broken: number;
  mandate_coverage_pct: number | null;
  eligibility_pct: number;
}

export interface Scenario {
  id: number;
  restructuring: number;
  restructuring_name: string | null;
  name: string;
  description: string;
  parent: number | null;
  is_baseline: boolean;
  payroll_plan: number | null;
  payroll_plan_name: string | null;
  cached_metrics: ScenarioMetrics | Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface ScenarioRanking {
  by_cost: number[];
  by_law_617_compliance: number[];
  by_positions: number[];
}

export interface ScenarioComparison {
  scenarios: Array<{
    id: number;
    name: string;
    is_baseline: boolean;
    metrics: ScenarioMetrics;
  }>;
  rankings: ScenarioRanking;
}

export interface DashboardRestructuringItem {
  id: number;
  name: string;
  status: RestructuringStatus;
  status_display: string;
  current_status_since: string | null;
  days_in_status: number | null;
  entity_name: string;
  entity_id: number;
  objectives_count: number;
}

export interface DashboardSummary {
  total_restructurings: number;
  by_status: Record<string, number>;
  total_employees: number;
  total_protected: number;
  total_positions_current: number;
  total_positions_proposed: number;
  validation_errors: number;
  validation_warnings: number;
  upcoming_consultations: Array<{
    id: number;
    entity_target: string;
    subject: string;
    sent_at: string | null;
    days_pending: number | null;
  }>;
}

export interface DashboardRestructuringDetail {
  restructuring_id: number;
  name: string;
  modules_complete_pct: number;
  validation: { errors: number; warnings: number; info: number };
  cost_current: number;
  cost_proposed: number;
  cost_delta: number;
  law_617_current: boolean | null;
  law_617_projected: boolean | null;
  positions_delta: number;
  protected_count: number;
}

export interface DashboardResponse {
  restructurings: DashboardRestructuringItem[];
  summary: DashboardSummary;
  per_restructuring: DashboardRestructuringDetail[];
}
