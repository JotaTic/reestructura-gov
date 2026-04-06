"""
Seed de factores prestacionales para 2026.

Carga TERRITORIAL_GENERAL y NACIONAL_GENERAL con sus componentes.

Factor TERRITORIAL_GENERAL 2026: 1.6200
  Componentes:
  - Prima de servicios: 8.33% (1/12)
  - Vacaciones: 4.17% (1/24)
  - Cesantías: 8.33%
  - Intereses cesantías: 1.0%
  - Prima de navidad: 8.33%
  - Salud empleador: 8.5%
  - Pensión empleador: 12.0%
  - ARL: 0.5% (promedio básico)
  - Caja de compensación: 4.0%
  - SENA: 2.0%
  - ICBF: 3.0%
  Total aproximado: 60.16% sobre salario = factor 1.6016 ≈ 1.62

Factor NACIONAL_GENERAL 2026: 1.6800 (incluye bonificaciones adicionales)
"""
from django.core.management.base import BaseCommand


TERRITORIAL_DETAIL = {
    'prima_servicios': 0.0833,
    'vacaciones': 0.0417,
    'cesantias': 0.0833,
    'intereses_cesantias': 0.0100,
    'prima_navidad': 0.0833,
    'aux_transporte': 0.0,
    'salud_empleador': 0.0850,
    'pension_empleador': 0.1200,
    'arl': 0.0050,
    'caja_compensacion': 0.0400,
    'sena': 0.0200,
    'icbf': 0.0300,
    'nota': 'Factor calculado sobre salario base sin aux. transporte. SENA/ICBF aplica a entidades del orden territorial.',
}

NACIONAL_DETAIL = {
    'prima_servicios': 0.0833,
    'vacaciones': 0.0417,
    'cesantias': 0.0833,
    'intereses_cesantias': 0.0100,
    'prima_navidad': 0.0833,
    'bonificacion_servicios': 0.0250,
    'salud_empleador': 0.0850,
    'pension_empleador': 0.1200,
    'arl': 0.0050,
    'caja_compensacion': 0.0400,
    'sena': 0.0200,
    'icbf': 0.0300,
    'nota': 'Incluye bonificación por servicios prestados del 25% del salario mensual / 12.',
}

FACTORS_DATA = [
    ('TERRITORIAL_GENERAL', 2026, '1.6200', TERRITORIAL_DETAIL),
    ('NACIONAL_GENERAL', 2026, '1.6800', NACIONAL_DETAIL),
]


class Command(BaseCommand):
    help = 'Siembra factores prestacionales 2026 (idempotente).'

    def handle(self, *args, **options):
        from decimal import Decimal
        from apps.nomina.models import PrestationalFactor

        created = 0
        for (regime, year, factor, detail) in FACTORS_DATA:
            _, was_created = PrestationalFactor.objects.update_or_create(
                regime=regime,
                year=year,
                defaults={
                    'factor': Decimal(factor),
                    'detail': detail,
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f'seed_prestational_factors: {created} nuevos de {len(FACTORS_DATA)} factores procesados.'
        ))
