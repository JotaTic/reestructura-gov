"""
Servicio de importación de nomenclatura de empleos desde archivo Excel (.xlsx).

Columnas esperadas:
    Código | Denominación | Nivel | Ámbito
"""
import openpyxl
from django.db import transaction

from .models import JobNomenclature, HierarchyLevel

EXPECTED_HEADERS = ['Código', 'Denominación', 'Nivel', 'Ámbito']

_LEVEL_MAP = {v.label.upper(): v.value for v in HierarchyLevel}
_LEVEL_MAP.update({v.value: v.value for v in HierarchyLevel})

_SCOPE_MAP = {v.label.upper(): v.value for v in JobNomenclature.Scope}
_SCOPE_MAP.update({v.value: v.value for v in JobNomenclature.Scope})
# Alias comunes
_SCOPE_MAP['NACIONAL'] = 'NACIONAL'
_SCOPE_MAP['TERRITORIAL'] = 'TERRITORIAL'


def _normalize_level(raw: str) -> str | None:
    key = str(raw).strip().upper()
    return _LEVEL_MAP.get(key)


def _normalize_scope(raw: str) -> str | None:
    key = str(raw).strip().upper()
    # También intentar búsqueda parcial
    if key in _SCOPE_MAP:
        return _SCOPE_MAP[key]
    for k, v in _SCOPE_MAP.items():
        if key in k or k in key:
            return v
    return None


def import_nomenclature_xlsx(file) -> dict:
    """
    Lee un archivo Excel y crea/actualiza JobNomenclature para cada fila válida.

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
                codigo = str(row[col['Código']] or '').strip()
                denominacion = str(row[col['Denominación']] or '').strip()
                nivel_raw = str(row[col['Nivel']] or '').strip()
                ambito_raw = str(row[col['Ámbito']] or '').strip()

                # Saltar filas vacías
                if not codigo and not denominacion:
                    continue

                nivel = _normalize_level(nivel_raw)
                if nivel is None:
                    errors.append(f'Fila {row_num}: Nivel "{nivel_raw}" no reconocido.')
                    continue

                scope = _normalize_scope(ambito_raw)
                if scope is None:
                    errors.append(f'Fila {row_num}: Ámbito "{ambito_raw}" no reconocido.')
                    continue

                _, is_created = JobNomenclature.objects.update_or_create(
                    scope=scope,
                    code=codigo,
                    denomination=denominacion,
                    defaults={'level': nivel},
                )
                if is_created:
                    created += 1
                else:
                    updated += 1

            except Exception as exc:
                errors.append(f'Fila {row_num}: Error inesperado — {exc}')

    wb.close()
    return {'created': created, 'updated': updated, 'errors': errors, 'warnings': warnings}
