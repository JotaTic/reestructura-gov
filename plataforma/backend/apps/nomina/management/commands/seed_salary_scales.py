"""
Seed de escalas salariales de referencia para 2026.

Carga ~20 filas representativas para los órdenes TERRITORIAL y NACIONAL,
todos los niveles y grados típicos.

Valores aproximados basados en proyecciones 2025-2026 (no exactos, razonables
para el contexto colombiano).
"""
from django.core.management.base import BaseCommand


# Escala base 2026 aproximada por nivel (TERRITORIAL)
# Formato: (order, year, level, grade, code, base_salary)
SCALE_DATA = [
    # TERRITORIAL 2026
    ('MUNICIPAL', 2026, 'ASISTENCIAL', '01', '407', 1_800_000),
    ('MUNICIPAL', 2026, 'ASISTENCIAL', '10', '407', 2_050_000),
    ('MUNICIPAL', 2026, 'ASISTENCIAL', '18', '407', 2_300_000),
    ('MUNICIPAL', 2026, 'TECNICO', '01', '314', 2_600_000),
    ('MUNICIPAL', 2026, 'TECNICO', '06', '314', 2_900_000),
    ('MUNICIPAL', 2026, 'TECNICO', '13', '314', 3_200_000),
    ('MUNICIPAL', 2026, 'PROFESIONAL', '01', '219', 3_800_000),
    ('MUNICIPAL', 2026, 'PROFESIONAL', '04', '219', 4_300_000),
    ('MUNICIPAL', 2026, 'PROFESIONAL', '08', '219', 4_900_000),
    ('MUNICIPAL', 2026, 'ASESOR', '01', '105', 5_500_000),
    ('MUNICIPAL', 2026, 'ASESOR', '04', '105', 6_100_000),
    ('MUNICIPAL', 2026, 'DIRECTIVO', '01', '020', 7_500_000),
    ('MUNICIPAL', 2026, 'DIRECTIVO', '04', '020', 8_500_000),
    # NACIONAL 2026 (+15% aprox)
    ('NACIONAL', 2026, 'ASISTENCIAL', '01', '407', 2_070_000),
    ('NACIONAL', 2026, 'TECNICO', '01', '314', 2_990_000),
    ('NACIONAL', 2026, 'TECNICO', '13', '314', 3_680_000),
    ('NACIONAL', 2026, 'PROFESIONAL', '01', '219', 4_370_000),
    ('NACIONAL', 2026, 'PROFESIONAL', '08', '219', 5_635_000),
    ('NACIONAL', 2026, 'ASESOR', '01', '105', 6_325_000),
    ('NACIONAL', 2026, 'DIRECTIVO', '01', '020', 8_625_000),
]


class Command(BaseCommand):
    help = 'Siembra escalas salariales de referencia 2026 (idempotente).'

    def handle(self, *args, **options):
        from decimal import Decimal
        from apps.nomina.models import SalaryScale

        created = 0
        for (order, year, level, grade, code, salary) in SCALE_DATA:
            _, was_created = SalaryScale.objects.update_or_create(
                order=order,
                year=year,
                level=level,
                code=code,
                grade=grade,
                defaults={'base_salary': Decimal(str(salary))},
            )
            if was_created:
                created += 1

        total = len(SCALE_DATA)
        self.stdout.write(self.style.SUCCESS(
            f'seed_salary_scales: {created} nuevas de {total} filas procesadas.'
        ))
