"""
Servicio de importación de escala salarial desde archivo Excel (.xlsx).

Columnas esperadas:
    Año | Orden | Nivel | Código | Grado | Salario
"""
from decimal import Decimal, InvalidOperation

import openpyxl
from django.db import transaction

from .models import SalaryScale

EXPECTED_HEADERS = ['Año', 'Orden', 'Nivel', 'Código', 'Grado', 'Salario']

_ORDER_MAP = {v.label.upper(): v.value for v in SalaryScale.Order}
_ORDER_MAP.update({v.value: v.value for v in SalaryScale.Order})

_LEVEL_MAP = {v.label.upper(): v.value for v in SalaryScale.Level}
_LEVEL_MAP.update({v.value: v.value for v in SalaryScale.Level})


def _normalize_order(raw: str) -> str | None:
    key = str(raw).strip().upper()
    return _ORDER_MAP.get(key)


def _normalize_level(raw: str) -> str | None:
    key = str(raw).strip().upper()
    return _LEVEL_MAP.get(key)


def import_salary_scale_xlsx(file) -> dict:
    """
    Lee un archivo Excel y crea/actualiza SalaryScale para cada fila válida.

    Retorna: {created: int, updated: int, errors: list[str], warnings: list[str]}
    """
    errors: list[str] = []
    warnings: list[str] = []
    created = 0
    updated = 0

    try:
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
    except Exception as exc:
        return {'created': 0, 'updated': 0, 'errors': [f'No se pudo leer el archivo Excel: {exc}'], 'warnings': []}

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {'created': 0, 'updated': 0, 'errors': ['El archivo está vacío.'], 'warnings': []}

    header = [str(c).strip() if c else '' for c in rows[0]]
    missing = [h for h in EXPECTED_HEADERS if h not in header]
    if missing:
        return {
            'created': 0,
            'updated': 0,
            'errors': [f'Columnas faltantes: {", ".join(missing)}. Se esperan: {", ".join(EXPECTED_HEADERS)}'],
            'warnings': [],
        }

    col = {h: header.index(h) for h in EXPECTED_HEADERS}

    with transaction.atomic():
        for row_num, row in enumerate(rows[1:], start=2):
            try:
                anio_raw = row[col['Año']]
                orden_raw = str(row[col['Orden']] or '').strip()
                nivel_raw = str(row[col['Nivel']] or '').strip()
                codigo = str(row[col['Código']] or '').strip()
                grado = str(row[col['Grado']] or '').strip()
                salario_raw = row[col['Salario']]

                # Saltar filas vacías
                if not codigo and not grado and not nivel_raw:
                    continue

                # Año
                try:
                    anio = int(anio_raw)
                except (ValueError, TypeError):
                    errors.append(f'Fila {row_num}: Año "{anio_raw}" inválido.')
                    continue

                # Orden
                orden = _normalize_order(orden_raw)
                if orden is None:
                    errors.append(f'Fila {row_num}: Orden "{orden_raw}" no reconocido.')
                    continue

                # Nivel
                nivel = _normalize_level(nivel_raw)
                if nivel is None:
                    errors.append(f'Fila {row_num}: Nivel "{nivel_raw}" no reconocido.')
                    continue

                # Salario
                try:
                    salario = Decimal(str(salario_raw)) if salario_raw is not None else Decimal('0')
                except (InvalidOperation, ValueError):
                    errors.append(f'Fila {row_num}: Salario "{salario_raw}" inválido.')
                    continue

                _, is_created = SalaryScale.objects.update_or_create(
                    order=orden,
                    year=anio,
                    level=nivel,
                    code=codigo,
                    grade=grado,
                    defaults={'base_salary': salario},
                )
                if is_created:
                    created += 1
                else:
                    updated += 1

            except Exception as exc:
                errors.append(f'Fila {row_num}: Error inesperado — {exc}')

    wb.close()
    return {'created': created, 'updated': updated, 'errors': errors, 'warnings': warnings}
