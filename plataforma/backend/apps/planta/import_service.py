"""
Servicio de importación de planta de personal desde archivo Excel (.xlsx).

Columnas esperadas:
    Dependencia | Nivel | Denominación | Código | Grado | Cantidad | Salario
"""
from decimal import Decimal, InvalidOperation

import openpyxl
from django.db import transaction

from apps.core.models import Department
from apps.nomenclatura.models import HierarchyLevel
from .models import PayrollPlan, PayrollPosition

EXPECTED_HEADERS = [
    'Dependencia', 'Nivel', 'Denominación', 'Código', 'Grado', 'Cantidad', 'Salario',
]

# Mapeo flexible de nombres de nivel a valores del enum
_LEVEL_MAP = {v.label.upper(): v.value for v in HierarchyLevel}
_LEVEL_MAP.update({v.value: v.value for v in HierarchyLevel})


def _normalize_level(raw: str) -> str | None:
    """Intenta mapear un texto libre al valor de HierarchyLevel."""
    key = str(raw).strip().upper()
    return _LEVEL_MAP.get(key)


def import_payroll_xlsx(file, plan: PayrollPlan) -> dict:
    """
    Lee un archivo Excel y crea PayrollPosition para cada fila válida.

    Retorna: {created: int, errors: list[str], warnings: list[str]}
    """
    errors: list[str] = []
    warnings: list[str] = []
    created = 0

    try:
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
    except Exception as exc:
        return {'created': 0, 'errors': [f'No se pudo leer el archivo Excel: {exc}'], 'warnings': []}

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {'created': 0, 'errors': ['El archivo está vacío.'], 'warnings': []}

    # Validar encabezados
    header = [str(c).strip() if c else '' for c in rows[0]]
    missing = [h for h in EXPECTED_HEADERS if h not in header]
    if missing:
        return {
            'created': 0,
            'errors': [f'Columnas faltantes: {", ".join(missing)}. Se esperan: {", ".join(EXPECTED_HEADERS)}'],
            'warnings': [],
        }

    col_idx = {h: header.index(h) for h in EXPECTED_HEADERS}
    entity = plan.entity

    with transaction.atomic():
        for row_num, row in enumerate(rows[1:], start=2):
            try:
                dept_name = str(row[col_idx['Dependencia']] or '').strip()
                nivel_raw = str(row[col_idx['Nivel']] or '').strip()
                denominacion = str(row[col_idx['Denominación']] or '').strip()
                codigo = str(row[col_idx['Código']] or '').strip()
                grado = str(row[col_idx['Grado']] or '').strip()
                cantidad_raw = row[col_idx['Cantidad']]
                salario_raw = row[col_idx['Salario']]

                # Saltar filas completamente vacías
                if not denominacion and not codigo:
                    continue

                # Nivel jerárquico
                nivel = _normalize_level(nivel_raw)
                if nivel is None:
                    errors.append(f'Fila {row_num}: Nivel "{nivel_raw}" no reconocido.')
                    continue

                # Cantidad
                try:
                    cantidad = int(cantidad_raw) if cantidad_raw is not None else 1
                except (ValueError, TypeError):
                    errors.append(f'Fila {row_num}: Cantidad "{cantidad_raw}" inválida.')
                    continue

                # Salario
                try:
                    salario = Decimal(str(salario_raw)) if salario_raw is not None else Decimal('0')
                except (InvalidOperation, ValueError):
                    errors.append(f'Fila {row_num}: Salario "{salario_raw}" inválido.')
                    continue

                # Departamento (find or create)
                department = None
                if dept_name:
                    department, dept_created = Department.objects.get_or_create(
                        entity=entity,
                        name=dept_name,
                    )
                    if dept_created:
                        warnings.append(f'Fila {row_num}: Se creó la dependencia "{dept_name}".')

                PayrollPosition.objects.create(
                    plan=plan,
                    department=department,
                    hierarchy_level=nivel,
                    denomination=denominacion,
                    code=codigo,
                    grade=grado,
                    quantity=cantidad,
                    monthly_salary=salario,
                )
                created += 1

            except Exception as exc:
                errors.append(f'Fila {row_num}: Error inesperado — {exc}')

    wb.close()
    return {'created': created, 'errors': errors, 'warnings': warnings}
