"""
Servicio de importación de matriz de cargas de trabajo desde archivo Excel (.xlsx).

Columnas esperadas:
    Proceso | Actividad | Procedimiento | Nivel | Denominación | Código |
    Grado | Propósito | Frecuencia | T.Mín | T.Usual | T.Máx
"""
from decimal import Decimal, InvalidOperation

import openpyxl
from django.db import transaction

from apps.core.models import Department
from apps.nomenclatura.models import HierarchyLevel
from .models import WorkloadMatrix, WorkloadEntry, FATIGUE_FACTOR

EXPECTED_HEADERS = [
    'Proceso', 'Actividad', 'Procedimiento', 'Nivel', 'Denominación',
    'Código', 'Grado', 'Propósito', 'Frecuencia', 'T.Mín', 'T.Usual', 'T.Máx',
]

_LEVEL_MAP = {v.label.upper(): v.value for v in HierarchyLevel}
_LEVEL_MAP.update({v.value: v.value for v in HierarchyLevel})


def _normalize_level(raw: str) -> str | None:
    key = str(raw).strip().upper()
    return _LEVEL_MAP.get(key)


def _to_decimal(value, field_name: str, row_num: int) -> tuple[Decimal | None, str | None]:
    """Convierte un valor a Decimal, retornando (valor, error)."""
    if value is None:
        return None, f'Fila {row_num}: {field_name} es obligatorio.'
    try:
        return Decimal(str(value)), None
    except (InvalidOperation, ValueError):
        return None, f'Fila {row_num}: {field_name} "{value}" no es un número válido.'


def import_workload_xlsx(file, matrix: WorkloadMatrix) -> dict:
    """
    Lee un archivo Excel y crea WorkloadEntry para cada fila válida.

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

    col = {h: header.index(h) for h in EXPECTED_HEADERS}
    entity = matrix.entity

    # Necesitamos una dependencia para cada entrada. Usaremos el Proceso como
    # fallback si no hay columna Dependencia explícita. Si existe, la usamos.
    has_dept_col = 'Dependencia' in header
    dept_col_idx = header.index('Dependencia') if has_dept_col else None

    with transaction.atomic():
        for row_num, row in enumerate(rows[1:], start=2):
            try:
                proceso = str(row[col['Proceso']] or '').strip()
                actividad = str(row[col['Actividad']] or '').strip()
                procedimiento = str(row[col['Procedimiento']] or '').strip()
                nivel_raw = str(row[col['Nivel']] or '').strip()
                denominacion = str(row[col['Denominación']] or '').strip()
                codigo = str(row[col['Código']] or '').strip()
                grado = str(row[col['Grado']] or '').strip()
                proposito = str(row[col['Propósito']] or '').strip()

                # Saltar filas vacías
                if not actividad and not proceso:
                    continue

                # Nivel
                nivel = _normalize_level(nivel_raw)
                if nivel is None:
                    errors.append(f'Fila {row_num}: Nivel "{nivel_raw}" no reconocido.')
                    continue

                # Frecuencia
                frecuencia, err = _to_decimal(row[col['Frecuencia']], 'Frecuencia', row_num)
                if err:
                    errors.append(err)
                    continue

                # Tiempos
                t_min, err = _to_decimal(row[col['T.Mín']], 'T.Mín', row_num)
                if err:
                    errors.append(err)
                    continue
                t_usual, err = _to_decimal(row[col['T.Usual']], 'T.Usual', row_num)
                if err:
                    errors.append(err)
                    continue
                t_max, err = _to_decimal(row[col['T.Máx']], 'T.Máx', row_num)
                if err:
                    errors.append(err)
                    continue

                # Dependencia
                dept_name = ''
                if has_dept_col:
                    dept_name = str(row[dept_col_idx] or '').strip()
                if not dept_name:
                    dept_name = proceso or 'Sin dependencia'

                department, dept_created = Department.objects.get_or_create(
                    entity=entity,
                    name=dept_name,
                )
                if dept_created:
                    warnings.append(f'Fila {row_num}: Se creó la dependencia "{dept_name}".')

                # Calcular TE = ((t_min + 4*t_usual + t_max) / 6) * 1.07
                te = ((t_min + Decimal('4') * t_usual + t_max) / Decimal('6')) * FATIGUE_FACTOR
                te = te.quantize(Decimal('0.0001'))

                # hh_month = frecuencia * TE
                hh = (frecuencia * te).quantize(Decimal('0.0001'))

                # Usamos create directo con campos calculados para evitar
                # full_clean que requiere department.entity == matrix.entity
                # (ya garantizado arriba).
                WorkloadEntry.objects.create(
                    matrix=matrix,
                    department=department,
                    process=proceso,
                    activity=actividad,
                    procedure=procedimiento,
                    hierarchy_level=nivel,
                    job_denomination=denominacion,
                    job_code=codigo,
                    job_grade=grado,
                    main_purpose=proposito,
                    monthly_frequency=frecuencia,
                    t_min=t_min,
                    t_usual=t_usual,
                    t_max=t_max,
                    standard_time=te,
                    hh_month=hh,
                )
                created += 1

            except Exception as exc:
                errors.append(f'Fila {row_num}: Error inesperado — {exc}')

    wb.close()
    return {'created': created, 'errors': errors, 'warnings': warnings}
