"""
Seed de demo para el módulo MFMP (M17).

Crea un MFMP para la primera entidad con proyecciones de ingresos,
gastos y deuda para los 10 años del horizonte (2026-2035).

Idempotente: no duplica si ya existe.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Crea un MFMP de demo para la primera entidad (idempotente).'

    def handle(self, *args, **options):
        from apps.core.models import Entity
        from apps.mfmp.models import (
            MFMP,
            MFMPIncomeProjection,
            MFMPExpenseProjection,
            MFMPDebtProjection,
            MFMPScenario,
            IncomeConcept,
            ExpenseConcept,
        )

        entity = Entity.objects.first()
        if entity is None:
            self.stderr.write('No hay entidades. Corre seed_users primero.')
            return

        # Crear el MFMP
        mfmp, created = MFMP.objects.get_or_create(
            entity=entity,
            base_year=2026,
            name='MFMP 2026–2035',
            defaults={
                'horizon_years': 10,
                'approved_by': 'Concejo Municipal',
                'notes': 'MFMP de demo generado automáticamente por seed_mfmp_demo.',
            },
        )
        if created:
            self.stdout.write(f'MFMP creado: {mfmp}')
        else:
            self.stdout.write(f'MFMP ya existe: {mfmp}')

        base_year = mfmp.base_year
        years = list(range(base_year, base_year + mfmp.horizon_years))

        # ---- Ingresos ----
        income_base: dict[str, Decimal] = {
            IncomeConcept.TRIBUTARIOS: Decimal('5000000000'),
            IncomeConcept.NO_TRIBUTARIOS: Decimal('1000000000'),
            IncomeConcept.TRANSFERENCIAS_SGP: Decimal('12000000000'),
            IncomeConcept.TRANSFERENCIAS_OTRAS: Decimal('800000000'),
            IncomeConcept.REGALIAS: Decimal('0'),
            IncomeConcept.COFINANCIACION: Decimal('500000000'),
            IncomeConcept.CREDITO: Decimal('0'),
            IncomeConcept.RECURSOS_BALANCE: Decimal('200000000'),
            IncomeConcept.OTROS: Decimal('100000000'),
        }

        income_growth: dict[str, Decimal] = {
            IncomeConcept.TRIBUTARIOS: Decimal('0.04'),
            IncomeConcept.NO_TRIBUTARIOS: Decimal('0.04'),
            IncomeConcept.TRANSFERENCIAS_SGP: Decimal('0.03'),
            IncomeConcept.TRANSFERENCIAS_OTRAS: Decimal('0.04'),
            IncomeConcept.REGALIAS: Decimal('0'),
            IncomeConcept.COFINANCIACION: Decimal('0.02'),
            IncomeConcept.CREDITO: Decimal('0'),
            IncomeConcept.RECURSOS_BALANCE: Decimal('0.02'),
            IncomeConcept.OTROS: Decimal('0.02'),
        }

        incomes_created = 0
        for concept, base_amount in income_base.items():
            growth = income_growth.get(concept, Decimal('0.04'))
            amount = base_amount
            for i, yr in enumerate(years):
                if i > 0:
                    amount = (amount * (1 + growth)).quantize(Decimal('1'))
                obj, created_row = MFMPIncomeProjection.objects.update_or_create(
                    mfmp=mfmp, year=yr, concept=concept,
                    defaults={'amount': amount},
                )
                if created_row:
                    incomes_created += 1

        self.stdout.write(f'Ingresos: {incomes_created} registros nuevos.')

        # ---- Gastos ----
        expense_base: dict[str, Decimal] = {
            ExpenseConcept.FUNCIONAMIENTO_PERSONAL: Decimal('8000000000'),
            ExpenseConcept.FUNCIONAMIENTO_GENERALES: Decimal('3500000000'),
            ExpenseConcept.FUNCIONAMIENTO_TRANSFERENCIAS: Decimal('500000000'),
            ExpenseConcept.SERVICIO_DEUDA: Decimal('800000000'),
            ExpenseConcept.INVERSION: Decimal('5000000000'),
            ExpenseConcept.OTROS: Decimal('200000000'),
        }

        expense_growth: dict[str, Decimal] = {
            ExpenseConcept.FUNCIONAMIENTO_PERSONAL: Decimal('0.04'),
            ExpenseConcept.FUNCIONAMIENTO_GENERALES: Decimal('0.03'),
            ExpenseConcept.FUNCIONAMIENTO_TRANSFERENCIAS: Decimal('0.03'),
            ExpenseConcept.SERVICIO_DEUDA: Decimal('-0.05'),  # decrece al pagar
            ExpenseConcept.INVERSION: Decimal('0.05'),
            ExpenseConcept.OTROS: Decimal('0.02'),
        }

        expenses_created = 0
        for concept, base_amount in expense_base.items():
            growth = expense_growth.get(concept, Decimal('0.04'))
            amount = base_amount
            for i, yr in enumerate(years):
                if i > 0:
                    amount = max(Decimal('0'), (amount * (1 + growth)).quantize(Decimal('1')))
                obj, created_row = MFMPExpenseProjection.objects.update_or_create(
                    mfmp=mfmp, year=yr, concept=concept,
                    defaults={'amount': amount},
                )
                if created_row:
                    expenses_created += 1

        self.stdout.write(f'Gastos: {expenses_created} registros nuevos.')

        # ---- Deuda ----
        debt_saldo_base = Decimal('4000000000')
        debts_created = 0
        saldo = debt_saldo_base
        for i, yr in enumerate(years):
            servicio = Decimal('500000000')
            nuevos = Decimal('0')
            if i > 0:
                saldo = max(Decimal('0'), saldo - servicio + nuevos)
            obj, created_row = MFMPDebtProjection.objects.update_or_create(
                mfmp=mfmp, year=yr,
                defaults={
                    'outstanding_debt': saldo,
                    'debt_service': servicio,
                    'new_disbursements': nuevos,
                },
            )
            if created_row:
                debts_created += 1

        self.stdout.write(f'Deuda: {debts_created} registros nuevos.')

        # ---- Escenario baseline ----
        scenario, s_created = MFMPScenario.objects.get_or_create(
            mfmp=mfmp,
            name='Baseline',
            defaults={
                'description': 'Escenario base del MFMP de demo.',
                'is_baseline': True,
                'deltas_json': {},
            },
        )
        if s_created:
            self.stdout.write(f'Escenario baseline creado: {scenario}')

        self.stdout.write(self.style.SUCCESS(
            f'seed_mfmp_demo completado para entidad: {entity.name}'
        ))
