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
  | "DRAFT"
  | "IN_PROGRESS"
  | "APPROVED"
  | "IMPLEMENTED"
  | "ARCHIVED";

export interface Restructuring {
  id: number;
  entity: number;
  entity_name: string;
  name: string;
  code: string;
  reference_date: string;
  status: RestructuringStatus;
  status_display: string;
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
