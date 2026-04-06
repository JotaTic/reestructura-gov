"""
Sprint 5 — Máquina de estados del Restructuring.

Define las transiciones permitidas y sus precondiciones.
Cada precondición es una función (restructuring) -> list[str]:
  - retorna lista vacía si pasa
  - retorna lista de razones si bloquea
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Transition:
    from_status: str
    to_status: str
    name: str
    responsible_group: str  # 'Planeación', 'Jurídica', etc.
    preconditions: list[Callable] = field(default_factory=list)
    description: str = ''


TRANSITIONS: list[Transition] = []


def register(t: Transition) -> Transition:
    TRANSITIONS.append(t)
    return t


# ---------------------------------------------------------------------------
# Precondiciones
# ---------------------------------------------------------------------------

def has_diagnosis_with_swot(restr) -> list[str]:
    """R-013-like: el restructuring tiene al menos un Diagnosis con ítems DOFA."""
    from apps.diagnostico.models import Diagnosis
    diagnoses = Diagnosis.objects.filter(restructuring=restr)
    if not diagnoses.exists():
        return ['No existe ningún diagnóstico registrado para esta reestructuración.']
    for diag in diagnoses:
        if diag.swot_items.exists():
            return []
    return ['Ningún diagnóstico tiene ítems DOFA registrados (se requiere al menos uno).']


def has_proposed_payroll_and_workload(restr) -> list[str]:
    """Requiere al menos un PayrollPlan propuesto y al menos una WorkloadMatrix."""
    from apps.planta.models import PayrollPlan
    from apps.cargas.models import WorkloadMatrix
    reasons = []
    if not PayrollPlan.objects.filter(restructuring=restr, kind='PROPOSED').exists():
        reasons.append('No existe una Planta Propuesta de Personal registrada.')
    if not WorkloadMatrix.objects.filter(restructuring=restr).exists():
        reasons.append('No existe una Matriz de Cargas de Trabajo registrada.')
    return reasons


def has_no_validation_errors(restr) -> list[str]:
    """Cero errores en el motor de validación declarativo."""
    from apps.common.validators import RULES
    errors = []
    seen = set()
    for rule in RULES:
        if rule.applies_to == 'restructuring' and rule.severity == 'error':
            if rule.code in seen:
                continue
            seen.add(rule.code)
            try:
                findings = rule.check({'restructuring': restr, 'entity': restr.entity})
                if findings:
                    errors.append(f'{rule.code}: {findings[0].message}')
            except Exception:
                pass
    return errors


def has_mfmp(restr) -> list[str]:
    """Requiere que la entidad tenga al menos un MFMP registrado."""
    from apps.mfmp.models import MFMP
    if not MFMP.objects.filter(entity=restr.entity).exists():
        return ['No existe un Marco Fiscal de Mediano Plazo para la entidad.']
    return []


def has_dafp_consultation_created(restr) -> list[str]:
    """Requiere OfficialConsultation DAFP creada."""
    try:
        from apps.consultas.models import OfficialConsultation
        if not OfficialConsultation.objects.filter(
            restructuring=restr,
            entity_target='DAFP',
        ).exists():
            return ['No existe una consulta oficial dirigida a la DAFP (Función Pública).']
    except Exception:
        return ['El módulo de consultas no está disponible.']
    return []


def has_dafp_response(restr) -> list[str]:
    """Requiere OfficialConsultation DAFP con response_at not null."""
    try:
        from apps.consultas.models import OfficialConsultation
        qs = OfficialConsultation.objects.filter(
            restructuring=restr,
            entity_target='DAFP',
            response_at__isnull=False,
        )
        if not qs.exists():
            return ['La consulta a la DAFP no tiene respuesta registrada (response_at vacío).']
    except Exception:
        return ['El módulo de consultas no está disponible.']
    return []


def has_committee_meeting(restr) -> list[str]:
    """Requiere CommitteeMeeting vinculado al restructuring."""
    try:
        from apps.participacion.models import CommitteeMeeting
        if not CommitteeMeeting.objects.filter(restructuring=restr).exists():
            return ['No existe una reunión de la Comisión de Personal asociada a esta reestructuración.']
    except Exception:
        return ['El módulo de participación no está disponible.']
    return []


def has_dafp_favorable(restr) -> list[str]:
    """Requiere concepto DAFP con response_result='FAVORABLE'."""
    try:
        from apps.consultas.models import OfficialConsultation
        qs = OfficialConsultation.objects.filter(
            restructuring=restr,
            entity_target='DAFP',
            response_result='FAVORABLE',
        )
        if not qs.exists():
            return ['El concepto de la DAFP no es FAVORABLE o no ha sido registrado.']
    except Exception:
        return ['El módulo de consultas no está disponible.']
    return []


def has_issued_act(restr) -> list[str]:
    """Requiere al menos un ActDraft con status=ISSUED."""
    try:
        from apps.actos.models import ActDraft
        if not ActDraft.objects.filter(entity=restr.entity, status='ISSUED').exists():
            return ['No existe ningún Acto Administrativo en estado EXPEDIDO.']
    except Exception:
        return ['El módulo de actos no está disponible.']
    return []


# ---------------------------------------------------------------------------
# Registro de transiciones
# ---------------------------------------------------------------------------

register(Transition(
    from_status='BORRADOR',
    to_status='DIAGNOSTICO_COMPLETO',
    name='Completar diagnóstico',
    responsible_group='Planeación',
    preconditions=[has_diagnosis_with_swot],
    description='Requiere al menos un diagnóstico con ítems DOFA registrados.',
))

register(Transition(
    from_status='DIAGNOSTICO_COMPLETO',
    to_status='ANALISIS_COMPLETO',
    name='Completar análisis técnico',
    responsible_group='Equipo Técnico',
    preconditions=[has_proposed_payroll_and_workload],
    description='Requiere planta propuesta y matriz de cargas de trabajo.',
))

register(Transition(
    from_status='ANALISIS_COMPLETO',
    to_status='REVISION_JURIDICA',
    name='Enviar a revisión jurídica',
    responsible_group='Jurídica',
    preconditions=[has_no_validation_errors],
    description='Requiere cero errores en la validación del motor declarativo.',
))

register(Transition(
    from_status='REVISION_JURIDICA',
    to_status='REVISION_FINANCIERA',
    name='Enviar a revisión financiera',
    responsible_group='Financiera',
    preconditions=[has_mfmp],
    description='Requiere que la entidad tenga un MFMP registrado.',
))

register(Transition(
    from_status='REVISION_FINANCIERA',
    to_status='CONCEPTO_DAFP_SOLICITADO',
    name='Solicitar concepto DAFP',
    responsible_group='Planeación',
    preconditions=[has_dafp_consultation_created],
    description='Requiere que exista una consulta oficial a la DAFP registrada.',
))

register(Transition(
    from_status='CONCEPTO_DAFP_SOLICITADO',
    to_status='CONCEPTO_DAFP_RECIBIDO',
    name='Registrar respuesta DAFP',
    responsible_group='Planeación',
    preconditions=[has_dafp_response],
    description='Requiere que la consulta a la DAFP tenga fecha de respuesta.',
))

register(Transition(
    from_status='CONCEPTO_DAFP_RECIBIDO',
    to_status='COMISION_PERSONAL_INFORMADA',
    name='Informar a Comisión de Personal',
    responsible_group='Talento Humano',
    preconditions=[has_committee_meeting],
    description='Requiere que exista una reunión de Comisión de Personal vinculada.',
))

register(Transition(
    from_status='COMISION_PERSONAL_INFORMADA',
    to_status='APROBADO',
    name='Aprobar reestructuración',
    responsible_group='Administrador',
    preconditions=[has_no_validation_errors, has_dafp_favorable],
    description='Requiere cero errores de validación y concepto DAFP FAVORABLE.',
))

register(Transition(
    from_status='APROBADO',
    to_status='ACTO_EXPEDIDO',
    name='Expedir acto administrativo',
    responsible_group='Jurídica',
    preconditions=[has_issued_act, has_dafp_favorable],
    description='Requiere acto expedido y concepto DAFP FAVORABLE.',
))

register(Transition(
    from_status='ACTO_EXPEDIDO',
    to_status='IMPLEMENTADO',
    name='Marcar como implementada',
    responsible_group='Planeación',
    preconditions=[],
    description='Sin precondiciones técnicas.',
))

register(Transition(
    from_status='IMPLEMENTADO',
    to_status='ARCHIVADO',
    name='Archivar reestructuración',
    responsible_group='Administrador',
    preconditions=[],
    description='Sin precondiciones técnicas.',
))
