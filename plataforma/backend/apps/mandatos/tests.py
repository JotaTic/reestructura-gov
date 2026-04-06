"""Tests para apps.mandatos."""
from __future__ import annotations

from django.test import TestCase

from apps.core.models import Entity, Restructuring
from apps.procesos.models import ProcessMap, Process
from .models import LegalMandate, MandateCompliance, MandateKind, CoverageLevel
from .services import gap_report


def _make_entity(name='MandEntity'):
    return Entity.objects.create(
        name=name, acronym=name[:4].upper(),
        order='MUNICIPAL', legal_nature='ALCALDIA',
        municipality_category='6',
    )


def _make_process(entity, name='Proceso'):
    restructuring = Restructuring.objects.create(
        entity=entity, name='R1', code='R001',
        reference_date='2026-01-01', status='DRAFT',
    )
    pm = ProcessMap.objects.create(
        entity=entity, restructuring=restructuring,
        kind=ProcessMap.Kind.CURRENT, name='Mapa',
        reference_date='2026-01-01',
    )
    process = Process.objects.create(
        process_map=pm, code='P01', name=name,
        type=Process.Type.MISIONAL, order=0,
    )
    return pm, process


class GapReportTest(TestCase):
    def setUp(self):
        self.entity = _make_entity()
        self.pm, self.process1 = _make_process(self.entity, 'Proceso 1')

        # Create a second process without compliance
        self.process2 = Process.objects.create(
            process_map=self.pm, code='P02', name='Proceso 2',
            type=Process.Type.APOYO, order=1,
        )

        # Create 3 mandates
        self.m1 = LegalMandate.objects.create(
            entity=self.entity, norm='Ley 715/2001', article='5',
            mandate_text='Prestar servicios educativos.',
            kind=MandateKind.EJECUCION,
        )
        self.m2 = LegalMandate.objects.create(
            entity=self.entity, norm='Ley 60/1993', article='3',
            mandate_text='Garantizar salud básica.',
            kind=MandateKind.EJECUCION,
        )
        self.m3 = LegalMandate.objects.create(
            entity=self.entity, norm='Const./1991', article='311',
            mandate_text='Administrar los asuntos municipales.',
            kind=MandateKind.REGULACION, is_constitutional=True,
        )

        # Only m1 and m2 have compliance with process1
        MandateCompliance.objects.create(
            mandate=self.m1, process=self.process1, coverage=CoverageLevel.FULL,
        )
        MandateCompliance.objects.create(
            mandate=self.m2, process=self.process1, coverage=CoverageLevel.PARTIAL,
        )
        # m3 has NO compliance → should appear in mandates_without_process

    def test_mandates_without_process_has_one(self):
        result = gap_report(self.entity)
        ids = [m['id'] for m in result['mandates_without_process']]
        self.assertIn(self.m3.pk, ids)

    def test_mandates_with_coverage_not_in_gap(self):
        result = gap_report(self.entity)
        ids = [m['id'] for m in result['mandates_without_process']]
        self.assertNotIn(self.m1.pk, ids)
        self.assertNotIn(self.m2.pk, ids)

    def test_processes_without_mandate_has_process2(self):
        result = gap_report(self.entity)
        ids = [p['id'] for p in result['processes_without_mandate']]
        self.assertIn(self.process2.pk, ids)

    def test_coverage_stats_present(self):
        result = gap_report(self.entity)
        stats = result['coverage_stats']
        for k in ('full', 'partial', 'none', 'untracked'):
            self.assertIn(k, stats)

    def test_coverage_stats_full_count(self):
        result = gap_report(self.entity)
        self.assertEqual(result['coverage_stats']['full'], 1)

    def test_coverage_stats_partial_count(self):
        result = gap_report(self.entity)
        self.assertEqual(result['coverage_stats']['partial'], 1)

    def test_no_entity_data_returns_empty(self):
        entity2 = _make_entity('E2NoMand')
        result = gap_report(entity2)
        self.assertEqual(result['mandates_without_process'], [])
        self.assertEqual(result['processes_without_mandate'], [])
