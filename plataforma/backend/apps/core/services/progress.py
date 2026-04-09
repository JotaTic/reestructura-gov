"""Servicio de cálculo de progreso de la reestructuración por fase."""


def calculate_progress(restructuring):
    """
    Calcula el progreso de cada fase de la reestructuración.
    Retorna dict con fases F0-F6, cada una con checks y porcentaje.
    """
    entity = restructuring.entity
    rid = restructuring.id
    eid = entity.id

    from apps.core.models import Department, RestructuringObjective, TimelineActivity
    from apps.diagnostico.models import Diagnosis
    from apps.cargas.models import WorkloadMatrix
    from apps.planta.models import PayrollPlan
    from apps.procesos.models import ProcessMap
    from apps.mfmp.models import MFMP
    from apps.consultas.models import OfficialConsultation
    from apps.participacion.models import CommitteeMeeting
    from apps.actos.models import ActDraft

    def pct(checks):
        if not checks:
            return 0
        done = sum(1 for c in checks if c['done'])
        return round(done / len(checks) * 100)

    # F0 — Configuración
    deps_count = Department.objects.filter(entity_id=eid).count()
    has_current_plan = PayrollPlan.objects.filter(entity_id=eid, restructuring_id=rid, kind='CURRENT').exists()
    f0_checks = [
        {'key': 'entity_configured', 'label': 'Entidad configurada', 'done': True},
        {'key': 'departments', 'label': 'Dependencias creadas', 'done': deps_count > 0},
        {'key': 'current_plan', 'label': 'Planta actual cargada', 'done': has_current_plan},
    ]

    # F1 — Acuerdo inicial
    has_objectives = RestructuringObjective.objects.filter(restructuring_id=rid).exists()
    has_timeline = TimelineActivity.objects.filter(entity_id=eid).exists()
    has_agreement = bool(entity.problem_statement and entity.objectives)
    f1_checks = [
        {'key': 'objectives', 'label': 'Objetivos definidos', 'done': has_objectives},
        {'key': 'timeline', 'label': 'Cronograma creado', 'done': has_timeline},
        {'key': 'agreement', 'label': 'Acuerdo inicial documentado', 'done': has_agreement},
    ]

    # F2 — Diagnóstico
    has_diagnosis = Diagnosis.objects.filter(restructuring_id=rid).exists()
    has_dofa = False
    if has_diagnosis:
        diag = Diagnosis.objects.filter(restructuring_id=rid).first()
        has_dofa = diag.swot_items.exists() if diag else False
    f2_checks = [
        {'key': 'diagnosis', 'label': 'Diagnóstico creado', 'done': has_diagnosis},
        {'key': 'dofa', 'label': 'DOFA con ítems', 'done': has_dofa},
        {'key': 'legal_framework', 'label': 'Marco legal correlacionado', 'done': has_diagnosis},
    ]

    # F3 — Diseño técnico
    has_processes = ProcessMap.objects.filter(restructuring_id=rid).exists()
    has_workload = WorkloadMatrix.objects.filter(restructuring_id=rid).exists()
    has_proposed = PayrollPlan.objects.filter(restructuring_id=rid, kind='PROPOSED').exists()
    f3_checks = [
        {'key': 'processes', 'label': 'Procesos mapeados', 'done': has_processes},
        {'key': 'workload', 'label': 'Cargas levantadas', 'done': has_workload},
        {'key': 'proposed_plan', 'label': 'Planta propuesta', 'done': has_proposed},
    ]

    # F4 — Análisis
    has_mfmp = MFMP.objects.filter(entity_id=eid).exists()
    # Check validation errors
    validation_ok = False
    try:
        from apps.common.validators import RULES
        errors = 0
        for rule in RULES:
            if rule.applies_to == 'restructuring' and rule.severity == 'error':
                try:
                    findings = rule.check({'restructuring': restructuring, 'entity': entity})
                    errors += len(findings)
                except Exception:
                    pass
        validation_ok = errors == 0
    except Exception:
        pass
    f4_checks = [
        {'key': 'validation', 'label': '0 errores de validación', 'done': validation_ok},
        {'key': 'mfmp', 'label': 'MFMP registrado', 'done': has_mfmp},
    ]

    # F5 — Gobierno
    has_dafp = OfficialConsultation.objects.filter(restructuring_id=rid, entity_target='DAFP').exists()
    has_dafp_response = OfficialConsultation.objects.filter(
        restructuring_id=rid, entity_target='DAFP', response_at__isnull=False,
    ).exists()
    has_dafp_favorable = OfficialConsultation.objects.filter(
        restructuring_id=rid, entity_target='DAFP', response_result='FAVORABLE',
    ).exists()
    has_committee = CommitteeMeeting.objects.filter(restructuring_id=rid).exists()
    has_act = ActDraft.objects.filter(entity_id=eid, status='ISSUED').exists()
    f5_checks = [
        {'key': 'dafp_sent', 'label': 'Consulta DAFP enviada', 'done': has_dafp},
        {'key': 'dafp_response', 'label': 'Concepto DAFP recibido', 'done': has_dafp_response},
        {'key': 'dafp_favorable', 'label': 'Concepto DAFP favorable', 'done': has_dafp_favorable},
        {'key': 'committee', 'label': 'Comisión informada', 'done': has_committee},
        {'key': 'act_issued', 'label': 'Acto expedido', 'done': has_act},
    ]

    # F6 — Implementación
    is_implemented = restructuring.status in ('IMPLEMENTADO', 'ARCHIVADO')
    is_archived = restructuring.status == 'ARCHIVADO'
    f6_checks = [
        {'key': 'implemented', 'label': 'Implementado', 'done': is_implemented},
        {'key': 'archived', 'label': 'Archivado', 'done': is_archived},
    ]

    phases = [
        {'phase': 'F0', 'name': 'Configuración', 'checks': f0_checks, 'pct': pct(f0_checks)},
        {'phase': 'F1', 'name': 'Acuerdo Inicial', 'checks': f1_checks, 'pct': pct(f1_checks)},
        {'phase': 'F2', 'name': 'Diagnóstico', 'checks': f2_checks, 'pct': pct(f2_checks)},
        {'phase': 'F3', 'name': 'Diseño Técnico', 'checks': f3_checks, 'pct': pct(f3_checks)},
        {'phase': 'F4', 'name': 'Análisis', 'checks': f4_checks, 'pct': pct(f4_checks)},
        {'phase': 'F5', 'name': 'Gobierno', 'checks': f5_checks, 'pct': pct(f5_checks)},
        {'phase': 'F6', 'name': 'Implementación', 'checks': f6_checks, 'pct': pct(f6_checks)},
    ]

    total_checks = sum(len(p['checks']) for p in phases)
    total_done = sum(sum(1 for c in p['checks'] if c['done']) for p in phases)
    overall_pct = round(total_done / total_checks * 100) if total_checks else 0

    return {
        'restructuring_id': rid,
        'restructuring_name': restructuring.name,
        'status': restructuring.status,
        'phases': phases,
        'overall_pct': overall_pct,
        'total_checks': total_checks,
        'total_done': total_done,
    }
