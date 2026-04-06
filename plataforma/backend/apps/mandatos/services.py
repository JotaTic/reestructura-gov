"""Servicios para apps.mandatos."""
from __future__ import annotations


def gap_report(entity) -> dict:
    """
    Genera el reporte de brecha entre mandatos y procesos de la entidad.

    - mandates_without_process: mandatos sin ninguna cobertura FULL o PARTIAL.
    - processes_without_mandate: procesos del último ProcessMap sin cumplimiento.
    - coverage_stats: distribución full/partial/none/untracked.
    """
    from .models import LegalMandate, MandateCompliance, CoverageLevel
    from apps.procesos.models import ProcessMap, Process

    all_mandates = LegalMandate.objects.filter(entity=entity)

    # Mandatos sin proceso con cobertura
    mandates_with_coverage = (
        MandateCompliance.objects
        .filter(mandate__entity=entity)
        .exclude(coverage=CoverageLevel.NONE)
        .values_list('mandate_id', flat=True)
    )
    mandates_without_process = list(
        all_mandates.exclude(id__in=mandates_with_coverage)
        .values('id', 'norm', 'article', 'kind', 'mandate_text')
    )

    # Procesos del último ProcessMap sin cumplimiento
    pm_qs = ProcessMap.objects.filter(entity=entity).order_by('-reference_date', '-created_at')
    processes_without_mandate = []
    if pm_qs.exists():
        pm = pm_qs.first()
        processes_with_compliance = (
            MandateCompliance.objects
            .filter(process__process_map=pm)
            .values_list('process_id', flat=True)
        )
        processes_without_mandate = list(
            Process.objects.filter(process_map=pm)
            .exclude(id__in=processes_with_compliance)
            .values('id', 'code', 'name', 'type')
        )

    # Coverage stats
    all_compliances = MandateCompliance.objects.filter(mandate__entity=entity)
    full_count = all_compliances.filter(coverage=CoverageLevel.FULL).count()
    partial_count = all_compliances.filter(coverage=CoverageLevel.PARTIAL).count()
    none_count = all_compliances.filter(coverage=CoverageLevel.NONE).count()
    total_mandates = all_mandates.count()
    covered_mandate_ids = set(all_compliances.values_list('mandate_id', flat=True))
    untracked_count = total_mandates - len(covered_mandate_ids)

    return {
        'mandates_without_process': mandates_without_process,
        'processes_without_mandate': processes_without_mandate,
        'coverage_stats': {
            'full': full_count,
            'partial': partial_count,
            'none': none_count,
            'untracked': untracked_count,
        },
    }
