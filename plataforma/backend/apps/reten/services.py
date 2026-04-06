"""
Services del módulo Retén Social (Sprint 4 — bloque 4.2).

Detección automática de población protegida a partir de las hojas de vida (talento.Employee).
"""
from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.core.models import Entity


def detect_pre_pensioned(entity: 'Entity') -> list:
    """
    Recorre Employee.objects.filter(entity=entity).
    Para cada uno usa apps.talento.services.calculate_retirement_eligibility.
    Si is_pre_pensioned=True:
      - Busca ProtectedEmployee por employee_ref=employee. Si no existe, lo crea con
        protection_type='PRE_PENSIONADO', is_manual=False, evidence con años restantes.
      - Si existe y is_manual=True, NO lo toca.
      - Si existe y is_manual=False, actualiza evidence/protection_end.
    Devuelve lista de ids creados/actualizados.
    """
    from apps.talento.models import Employee
    from apps.talento.services import calculate_retirement_eligibility
    from .models import ProtectedEmployee

    affected_ids = []

    for emp in Employee.objects.filter(entity=entity).prefetch_related('experience', 'protection_records'):
        eligibility = calculate_retirement_eligibility(emp)
        if not eligibility['is_pre_pensioned']:
            continue

        years_remaining = eligibility['years_remaining']
        evidence = eligibility['reason']

        existing = ProtectedEmployee.objects.filter(
            entity=entity,
            employee_ref=emp,
            protection_type=ProtectedEmployee.Protection.PRE_PENSIONADO,
        ).first()

        if existing is None:
            pe = ProtectedEmployee.objects.create(
                entity=entity,
                employee_ref=emp,
                full_name=emp.full_name,
                id_type=emp.id_type,
                id_number=emp.id_number,
                protection_type=ProtectedEmployee.Protection.PRE_PENSIONADO,
                is_manual=False,
                active=True,
                evidence=evidence,
            )
            affected_ids.append(pe.id)
        elif existing.is_manual:
            # No tocar registros manuales
            pass
        else:
            existing.evidence = evidence
            existing.save(update_fields=['evidence', 'updated_at'])
            affected_ids.append(existing.id)

    return affected_ids


def detect_head_of_household(entity: 'Entity') -> list:
    """
    Igual pero usando employee.is_head_of_household →
    protection_type='MADRE_CABEZA' si sex='F', 'PADRE_CABEZA' si sex='M'.
    """
    from apps.talento.models import Employee
    from .models import ProtectedEmployee

    affected_ids = []

    for emp in Employee.objects.filter(entity=entity, is_head_of_household=True):
        ptype = (
            ProtectedEmployee.Protection.MADRE_CABEZA
            if emp.sex == 'F'
            else ProtectedEmployee.Protection.PADRE_CABEZA
        )
        evidence = (
            f'Empleado/a {emp.full_name} registrado/a como cabeza de hogar en la hoja de vida.'
        )

        existing = ProtectedEmployee.objects.filter(
            entity=entity,
            employee_ref=emp,
            protection_type=ptype,
        ).first()

        if existing is None:
            pe = ProtectedEmployee.objects.create(
                entity=entity,
                employee_ref=emp,
                full_name=emp.full_name,
                id_type=emp.id_type,
                id_number=emp.id_number,
                protection_type=ptype,
                is_manual=False,
                active=True,
                evidence=evidence,
            )
            affected_ids.append(pe.id)
        elif existing.is_manual:
            pass
        else:
            existing.evidence = evidence
            existing.save(update_fields=['evidence', 'updated_at'])
            affected_ids.append(existing.id)

    return affected_ids


def detect_disability(entity: 'Entity') -> list:
    """Igual usando employee.has_disability → protection_type='DISCAPACIDAD'."""
    from apps.talento.models import Employee
    from .models import ProtectedEmployee

    affected_ids = []

    for emp in Employee.objects.filter(entity=entity, has_disability=True):
        pct = emp.disability_percentage or 0
        evidence = (
            f'Empleado/a {emp.full_name} con discapacidad registrada '
            f'({pct}%) en la hoja de vida.'
        )

        existing = ProtectedEmployee.objects.filter(
            entity=entity,
            employee_ref=emp,
            protection_type=ProtectedEmployee.Protection.DISCAPACIDAD,
        ).first()

        if existing is None:
            pe = ProtectedEmployee.objects.create(
                entity=entity,
                employee_ref=emp,
                full_name=emp.full_name,
                id_type=emp.id_type,
                id_number=emp.id_number,
                protection_type=ProtectedEmployee.Protection.DISCAPACIDAD,
                is_manual=False,
                active=True,
                evidence=evidence,
            )
            affected_ids.append(pe.id)
        elif existing.is_manual:
            pass
        else:
            existing.evidence = evidence
            existing.save(update_fields=['evidence', 'updated_at'])
            affected_ids.append(existing.id)

    return affected_ids


def sync_reten_automatico(entity: 'Entity') -> dict:
    """
    Orquesta los 3 detectores.
    Devuelve {'pre_pensioned': n, 'head_of_household': n, 'disability': n,
              'total_automated': n, 'manual_preserved': n}.
    """
    from .models import ProtectedEmployee

    pre_pensioned_ids = detect_pre_pensioned(entity)
    household_ids = detect_head_of_household(entity)
    disability_ids = detect_disability(entity)

    # Contar cuántos registros manuales hay (preservados intactos)
    manual_count = ProtectedEmployee.objects.filter(entity=entity, is_manual=True).count()

    automated = len(set(pre_pensioned_ids + household_ids + disability_ids))
    return {
        'pre_pensioned': len(pre_pensioned_ids),
        'head_of_household': len(household_ids),
        'disability': len(disability_ids),
        'total_automated': automated,
        'manual_preserved': manual_count,
    }
