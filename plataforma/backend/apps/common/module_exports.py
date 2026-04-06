"""
Productores de "sections" para cada módulo de ReEstructura.Gov.

Cada función recibe el objeto principal (o un queryset ya filtrado por la
entidad/reestructuración activa) y devuelve una tupla:

    (title, meta, sections, filename_base, filename_context)

Esa tupla se pasa al dispatcher `apps.common.exports.export_response(fmt, ...)`
para obtener la `HttpResponse` final en XLSX o DOCX.

Mantén estas funciones **puras**: sin side effects, sin acceso a `request`,
solo leen datos del modelo. Eso las hace fáciles de probar y reusar desde
management commands o tareas en background.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Iterable

from apps.common.exports import Section


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _d(value) -> str:
    """Formatea decimales/fechas a string legible."""
    if value is None:
        return ''
    if isinstance(value, Decimal):
        return f'{value:,.2f}'
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _entity_meta(entity, *, extras: list[tuple[str, str]] | None = None) -> list[tuple[str, str]]:
    meta: list[tuple[str, str]] = [
        ('Entidad', entity.name if entity else ''),
        ('Sigla', getattr(entity, 'acronym', '') or '—'),
        ('Orden', entity.get_order_display() if entity else ''),
        ('Naturaleza jurídica', entity.get_legal_nature_display() if entity else ''),
        ('NIT', getattr(entity, 'nit', '') or '—'),
        ('Generado', date.today().isoformat()),
    ]
    if extras:
        meta.extend(extras)
    return meta


# ---------------------------------------------------------------------------
# M5 — Base Legal
# ---------------------------------------------------------------------------

def export_legal_catalog(queryset) -> tuple:
    """
    queryset: LegalNorm.objects — ya filtrado/ordenado por la vista.
    """
    sections: list[Section] = [{
        'heading': 'Catálogo normativo y jurisprudencial',
        'description': 'Normas y providencias aplicables al rediseño institucional.',
        'headers': ['#', 'Tipo', 'Referencia', 'Año', 'Título', 'Aplica a', 'Artículos clave', 'Resumen'],
        'rows': [
            [i + 1, n.get_kind_display(), n.reference, n.year, n.title, n.applies_to or '—',
             n.key_articles or '—', n.summary]
            for i, n in enumerate(queryset)
        ],
        'notes': 'Fuente: Ley 489/1998, Ley 909/2004, CPACA (Ley 1437/2011), Decretos 785/2005, '
                 '1083/2015, 2489/2006 y jurisprudencia relacionada.',
    }]
    title = 'Base legal — ReEstructura.Gov'
    meta = [('Módulo', 'M5 · Base Legal'), ('Total de registros', len(sections[0]['rows'])),
            ('Generado', date.today().isoformat())]
    return title, meta, sections, 'base_legal', ''


# ---------------------------------------------------------------------------
# M6 — Diagnóstico Institucional
# ---------------------------------------------------------------------------

def export_diagnosis(diagnosis) -> tuple:
    sections: list[Section] = []

    sections.append({
        'heading': 'Rol institucional',
        'description': 'Misión, visión y análisis de funciones generales.',
        'headers': ['Campo', 'Contenido'],
        'rows': [
            ['Misión / objeto social', diagnosis.mission or '—'],
            ['Visión', diagnosis.vision or '—'],
            ['Análisis de funciones', diagnosis.functions_analysis or '—'],
            ['Duplicidades identificadas', diagnosis.duplications or '—'],
        ],
    })

    # DOFA agrupado por tipo
    swot_items = list(diagnosis.swot_items.all())
    for type_code, type_label in (('F', 'Fortalezas'), ('D', 'Debilidades'),
                                  ('O', 'Oportunidades'), ('A', 'Amenazas')):
        items = [i for i in swot_items if i.type == type_code]
        sections.append({
            'heading': f'DOFA — {type_label}',
            'description': 'Clasificado por las 5 dimensiones de la Cartilla FP 2018 '
                           '(directiva, competitiva, técnica, tecnológica, talento humano).',
            'headers': ['#', 'Dimensión', 'Descripción', 'Prioridad'],
            'rows': [
                [i + 1, it.get_dimension_display(), it.description, it.get_priority_display()]
                for i, it in enumerate(sorted(items, key=lambda x: (x.dimension, x.order)))
            ],
        })

    legal_refs = list(diagnosis.legal_refs.all())
    sections.append({
        'heading': 'Marco legal correlacionado',
        'description': 'Cada norma/jurisprudencia vinculada a una decisión del rediseño.',
        'headers': ['#', 'Norma', 'Artículo / providencia', 'Tema', 'Decisión del rediseño'],
        'rows': [
            [i + 1, lr.norm, lr.article or '—', lr.topic or '—', lr.correlated_decision]
            for i, lr in enumerate(legal_refs)
        ],
    })

    environments = list(diagnosis.environments.all())
    sections.append({
        'heading': 'Análisis de entornos',
        'description': 'Entornos económico, político, social, tecnológico y cultura organizacional.',
        'headers': ['#', 'Dimensión', 'Impacto', 'Descripción'],
        'rows': [
            [i + 1, e.get_dimension_display(), e.get_impact_display(), e.description]
            for i, e in enumerate(environments)
        ],
    })

    title = f'Diagnóstico institucional — {diagnosis.name}'
    meta = _entity_meta(diagnosis.entity, extras=[
        ('Módulo', 'M6 · Diagnóstico'),
        ('Reestructuración', diagnosis.restructuring.name),
        ('Fecha de referencia', diagnosis.reference_date.isoformat()),
    ])
    ctx = (diagnosis.entity.acronym or diagnosis.entity.name[:20],
           diagnosis.reference_date.isoformat())
    return title, meta, sections, 'diagnostico', '_'.join(ctx)


# ---------------------------------------------------------------------------
# M7 — Análisis Financiero
# ---------------------------------------------------------------------------

def export_fiscal_years(entity, queryset) -> tuple:
    rows = []
    for fy in queryset.order_by('year'):
        rows.append([
            fy.year,
            _d(fy.current_income),
            _d(fy.operating_expenses),
            _d(fy.personnel_expenses),
            f'{fy.law_617_ratio}%',
            f'{fy.law_617_limit_pct}%',
            'Cumple' if fy.law_617_compliant else 'No cumple',
            _d(fy.debt_service),
            _d(fy.total_debt),
            f'{fy.solvency_ratio}%',
            f'{fy.sustainability_ratio}%',
        ])

    sections: list[Section] = [{
        'heading': 'Indicadores fiscales por año',
        'description': 'ICLD, gastos de funcionamiento, indicadores Ley 617/2000 y Ley 358/1997.',
        'headers': ['Año', 'ICLD', 'Gastos func.', 'Gastos personal',
                    '% Func/ICLD', 'Límite 617', 'Cumplimiento 617',
                    'Servicio deuda', 'Saldo deuda', '% Solvencia', '% Sostenibilidad'],
        'rows': rows,
        'notes': 'Indicadores calculados automáticamente. El límite de la Ley 617/2000 '
                 'depende de la categoría municipal registrada en la entidad.',
    }]
    title = f'Análisis financiero — {entity.name if entity else ""}'
    meta = _entity_meta(entity, extras=[
        ('Módulo', 'M7 · Análisis Financiero'),
        ('Años registrados', len(rows)),
    ])
    return title, meta, sections, 'financiero', entity.acronym if entity else ''


# ---------------------------------------------------------------------------
# M8 — Procesos y cadena de valor
# ---------------------------------------------------------------------------

def export_process_map(process_map) -> tuple:
    processes = list(process_map.processes.all())
    sections: list[Section] = []

    for type_code, type_label in (('ESTRATEGICO', 'Procesos estratégicos'),
                                  ('MISIONAL', 'Procesos misionales'),
                                  ('APOYO', 'Procesos de apoyo'),
                                  ('EVALUACION', 'Procesos de evaluación y control')):
        subset = [p for p in processes if p.type == type_code]
        sections.append({
            'heading': type_label,
            'description': 'Clasificación por el numeral 3.4 de la Cartilla FP: '
                           '¿se requiere? ¿lo ejecuta la entidad? ¿hay duplicidad?',
            'headers': ['Código', 'Nombre', '¿Requerido?', '¿Ejecuta entidad?', '¿Duplicado?', 'Descripción'],
            'rows': [
                [p.code or '—', p.name,
                 'Sí' if p.required else 'No',
                 'Sí' if p.executable_by_entity else 'No',
                 'Sí' if p.duplicated else 'No',
                 p.description or '']
                for p in subset
            ],
        })

    chain = list(process_map.value_chain.all())
    sections.append({
        'heading': 'Cadena de valor',
        'description': 'Insumos → Procesos → Productos → Efectos → Impactos.',
        'headers': ['Eslabón', 'Descripción', 'Proceso relacionado'],
        'rows': [
            [link.get_stage_display(), link.description,
             link.related_process.name if link.related_process else '—']
            for link in chain
        ],
    })

    title = f'Mapa de procesos — {process_map.name}'
    meta = _entity_meta(process_map.entity, extras=[
        ('Módulo', 'M8 · Procesos'),
        ('Reestructuración', process_map.restructuring.name),
        ('Tipo de mapa', process_map.get_kind_display()),
        ('Fecha de referencia', process_map.reference_date.isoformat()),
    ])
    return title, meta, sections, 'procesos', process_map.reference_date.isoformat()


# ---------------------------------------------------------------------------
# M9 — Estructura orgánica (árbol de dependencias)
# ---------------------------------------------------------------------------

def export_structure(entity, departments_qs) -> tuple:
    """
    entity: Entity
    departments_qs: queryset de Department de la entidad.
    """
    departments = list(departments_qs.order_by('order', 'name'))
    by_parent: dict = {}
    for d in departments:
        by_parent.setdefault(d.parent_id, []).append(d)

    rows: list[list] = []

    def walk(parent_id, level: int):
        for d in by_parent.get(parent_id, []):
            indent = '  ' * level + ('• ' if level > 0 else '')
            rows.append([
                indent + d.name,
                d.code or '—',
                level,
                d.order,
            ])
            walk(d.id, level + 1)

    walk(None, 0)

    sections: list[Section] = [{
        'heading': 'Árbol de dependencias',
        'description': 'Estructura jerárquica de la entidad ordenada por nivel y orden de presentación.',
        'headers': ['Dependencia', 'Código', 'Nivel', 'Orden'],
        'rows': rows,
    }]
    title = f'Estructura orgánica — {entity.name if entity else ""}'
    meta = _entity_meta(entity, extras=[
        ('Módulo', 'M9 · Estructura Orgánica'),
        ('Total dependencias', len(departments)),
        ('Acto de estructura vigente', getattr(entity, 'current_structure_act', '') or '—'),
    ])
    return title, meta, sections, 'estructura', entity.acronym if entity else ''


# ---------------------------------------------------------------------------
# M10 — Matriz de cargas (Word; el Excel ya existe en cargas/services.py)
# ---------------------------------------------------------------------------

def export_matrix_docx(matrix) -> tuple:
    from collections import defaultdict

    entries = list(matrix.entries.select_related('department').all())
    by_dept = defaultdict(list)
    for e in entries:
        by_dept[e.department.name if e.department else 'Sin dependencia'].append(e)

    sections: list[Section] = []
    for dept_name, items in by_dept.items():
        sections.append({
            'heading': f'Dependencia — {dept_name}',
            'headers': ['Proceso', 'Actividad', 'Nivel', 'Denominación', 'Código-Grado',
                        'Frec./mes', 'Tmin', 'TU', 'Tmax', 'TE', 'HH/mes'],
            'rows': [
                [e.process, e.activity, e.get_hierarchy_level_display(),
                 e.job_denomination, f'{e.job_code}-{e.job_grade}' if e.job_code else '—',
                 _d(e.monthly_frequency), _d(e.t_min), _d(e.t_usual), _d(e.t_max),
                 _d(e.standard_time), _d(e.hh_month)]
                for e in items
            ],
        })

    title = f'Matriz de cargas — {matrix.name}'
    meta = _entity_meta(matrix.entity, extras=[
        ('Módulo', 'M10 · Matriz de Cargas'),
        ('Reestructuración', matrix.restructuring.name if matrix.restructuring else '—'),
        ('Fecha de referencia', matrix.reference_date.isoformat()),
        ('Total actividades', len(entries)),
        ('Total dependencias', len(by_dept)),
        ('Jornada referencia', '167 h/mes (Instructivo FP 24/04/2024)'),
        ('Fórmula TE', 'TE = [(Tmin + 4·TU + Tmax)/6] × 1.07'),
    ])
    return title, meta, sections, 'matriz_cargas', matrix.reference_date.isoformat()


# ---------------------------------------------------------------------------
# M11 — Planta de personal
# ---------------------------------------------------------------------------

def export_payroll_plan(plan) -> tuple:
    positions = list(plan.positions.select_related('department').all())

    # Agrupar por nivel jerárquico
    from collections import defaultdict
    by_level = defaultdict(list)
    for p in positions:
        by_level[p.get_hierarchy_level_display()].append(p)

    sections: list[Section] = []
    total_qty = 0
    total_monthly = Decimal('0')
    for level, items in by_level.items():
        level_qty = sum(p.quantity for p in items)
        level_monthly = sum((p.total_monthly for p in items), Decimal('0'))
        total_qty += level_qty
        total_monthly += level_monthly
        sections.append({
            'heading': f'Nivel — {level}',
            'headers': ['Cód.', 'Grado', 'Denominación', 'Dependencia',
                        'Cantidad', 'Asignación mensual', 'Total mensual', 'Total anual (12×)'],
            'rows': [
                [p.code or '—', p.grade or '—', p.denomination,
                 p.department.name if p.department else '—',
                 p.quantity, _d(p.monthly_salary), _d(p.total_monthly), _d(p.total_annual)]
                for p in items
            ],
            'notes': f'Subtotal nivel: {level_qty} cargos · ${_d(level_monthly)}/mes.',
        })

    sections.append({
        'heading': 'Totales de la planta',
        'headers': ['Concepto', 'Valor'],
        'rows': [
            ['Cantidad total de cargos', total_qty],
            ['Costo mensual total', _d(total_monthly)],
            ['Costo anual total (12 meses)', _d(total_monthly * 12)],
        ],
    })

    title = f'Planta de personal — {plan.name} ({plan.get_kind_display()})'
    meta = _entity_meta(plan.entity, extras=[
        ('Módulo', 'M11 · Planta de Personal'),
        ('Reestructuración', plan.restructuring.name),
        ('Tipo', plan.get_kind_display()),
        ('Estructura', plan.get_structure_display()),
        ('Fecha de referencia', plan.reference_date.isoformat()),
        ('Acto que la adopta', plan.adopted_by or '—'),
    ])
    return title, meta, sections, 'planta', f'{plan.kind.lower()}_{plan.reference_date.isoformat()}'


# ---------------------------------------------------------------------------
# M12 — Manual de funciones (reaprovecha build_functions_manual de cargas)
# ---------------------------------------------------------------------------

def export_functions_manual(matrix) -> tuple:
    """
    Usa el builder existente en apps.cargas.services.build_functions_manual
    y lo convierte en sections.
    """
    from apps.cargas.services import build_functions_manual
    manual = build_functions_manual(matrix)

    sections: list[Section] = []
    for job in manual.get('jobs', []):
        denom = job.get('denomination', '—')
        code = job.get('code', '')
        grade = job.get('grade', '')
        level = job.get('hierarchy_level', '')
        heading = f'{code}-{grade} {denom}'[:60] or 'Cargo'
        sections.append({
            'heading': heading,
            'description': f'Nivel: {level} · {job.get("total_positions", 0)} posiciones.',
            'headers': ['Campo', 'Contenido'],
            'rows': [
                ['Propósito principal', job.get('main_purpose', '—') or '—'],
                ['Requisitos', job.get('requirements', '—') or '—'],
                ['Dependencias', ', '.join(job.get('departments', [])) or '—'],
                ['Total horas-hombre/mes', _d(job.get('total_hh_month', 0))],
            ],
        })
        funcs = job.get('essential_functions', []) or []
        if funcs:
            sections.append({
                'heading': f'{heading} — Funciones esenciales',
                'headers': ['#', 'Función', 'HH/mes'],
                'rows': [[i + 1, f.get('activity', ''), _d(f.get('hh_month', 0))]
                         for i, f in enumerate(funcs)],
            })

    title = f'Manual de funciones — {manual.get("matrix_name", "")}'
    meta = _entity_meta(matrix.entity, extras=[
        ('Módulo', 'M12 · Manual de Funciones'),
        ('Matriz origen', manual.get('matrix_name', '')),
        ('Decreto nomenclatura', manual.get('nomenclature_decree', '')),
        ('Total cargos', len(manual.get('jobs', []))),
    ])
    return title, meta, sections, 'manual_funciones', matrix.reference_date.isoformat()


# ---------------------------------------------------------------------------
# M13 — Retén Social
# ---------------------------------------------------------------------------

def export_protected_employees(entity, queryset) -> tuple:
    items = list(queryset)
    from collections import defaultdict
    by_type = defaultdict(list)
    for e in items:
        by_type[e.get_protection_type_display()].append(e)

    sections: list[Section] = []
    for ptype, subset in by_type.items():
        sections.append({
            'heading': ptype,
            'headers': ['#', 'Nombre', 'Documento', 'Cargo', 'Dependencia',
                        'Vigente', 'Inicio', 'Fin estimado', 'Soporte'],
            'rows': [
                [i + 1, e.full_name, f'{e.id_type} {e.id_number}',
                 e.job_denomination or '—', e.department or '—',
                 'Sí' if e.active else 'No',
                 _d(e.protection_start), _d(e.protection_end),
                 e.evidence or '—']
                for i, e in enumerate(subset)
            ],
        })

    if not sections:
        sections = [{
            'heading': 'Retén social',
            'headers': ['Sin registros'],
            'rows': [],
            'description': 'No hay empleados con protección registrada para la entidad.',
        }]

    title = f'Retén social — {entity.name if entity else ""}'
    meta = _entity_meta(entity, extras=[
        ('Módulo', 'M13 · Retén Social'),
        ('Total protegidos', len(items)),
        ('Marco legal', 'Ley 790/2002 art. 12, Decreto 190/2003, Ley 361/1997, '
                        'T-014/07, T-078/09, 25000-23-25-000-2001-07679-02'),
    ])
    return title, meta, sections, 'reten_social', entity.acronym if entity else ''


# ---------------------------------------------------------------------------
# M15 — Hoja de vida del empleado
# ---------------------------------------------------------------------------

def export_employee_cv(employee) -> tuple:
    """
    Genera la hoja de vida de un empleado en formato exportable.

    employee: apps.talento.models.Employee (con prefetch de sub-relaciones).
    """
    sections: list[Section] = []

    # Datos básicos
    sections.append({
        'heading': 'Datos básicos',
        'headers': ['Campo', 'Valor'],
        'rows': [
            ['Nombre completo', employee.full_name],
            ['Documento', f'{employee.get_id_type_display()} {employee.id_number}'],
            ['Fecha de nacimiento', _d(employee.birth_date)],
            ['Sexo', employee.get_sex_display()],
            ['Cabeza de hogar', 'Sí' if employee.is_head_of_household else 'No'],
            ['Discapacidad', f'Sí ({employee.disability_percentage}%)' if employee.has_disability else 'No'],
            ['Correo', employee.email or '—'],
            ['Teléfono', employee.phone or '—'],
        ],
    })

    # Educación
    edu_rows = [
        [i + 1, e.get_level_display(), e.institution, e.program, e.title,
         _d(e.graduation_date), e.credential_number or '—']
        for i, e in enumerate(employee.education.all())
    ]
    sections.append({
        'heading': 'Formación académica',
        'headers': ['#', 'Nivel', 'Institución', 'Programa', 'Título', 'Fecha grado', 'T.P.'],
        'rows': edu_rows,
    })

    # Experiencia
    exp_rows = [
        [i + 1, e.employer, e.position_name, e.get_sector_display(),
         _d(e.start_date), _d(e.end_date) or 'Actual',
         'Sí' if e.is_public_sector else 'No']
        for i, e in enumerate(employee.experience.all().order_by('-start_date'))
    ]
    sections.append({
        'heading': 'Experiencia laboral',
        'headers': ['#', 'Empleador', 'Cargo', 'Sector', 'Inicio', 'Retiro', 'Sector público'],
        'rows': exp_rows,
    })

    # Capacitación
    cap_rows = [
        [i + 1, t.topic, t.hours, t.institution, _d(t.completed_at)]
        for i, t in enumerate(employee.training.all())
    ]
    sections.append({
        'heading': 'Capacitación y formación complementaria',
        'headers': ['#', 'Tema', 'Horas', 'Institución', 'Fecha'],
        'rows': cap_rows,
    })

    # Evaluaciones
    eval_rows = [
        [ev.year, ev.score, ev.get_result_display(), ev.evaluator, _d(ev.at)]
        for ev in employee.evaluations.all().order_by('-year')
    ]
    sections.append({
        'heading': 'Evaluaciones de desempeño',
        'headers': ['Año', 'Puntaje', 'Resultado', 'Evaluador', 'Fecha'],
        'rows': eval_rows,
    })

    title = f'Hoja de vida — {employee.full_name}'
    meta = [
        ('Empleado', employee.full_name),
        ('Documento', f'{employee.get_id_type_display()} {employee.id_number}'),
        ('Entidad', employee.entity.name),
        ('Módulo', 'M15 · Hojas de vida'),
        ('Generado', date.today().isoformat()),
    ]
    filename_ctx = employee.id_number
    return title, meta, sections, 'hoja_de_vida', filename_ctx


# ---------------------------------------------------------------------------
# M14 — Actos Administrativos (un borrador)
# ---------------------------------------------------------------------------

def export_act_draft(draft) -> tuple:
    sections: list[Section] = [{
        'heading': 'Identificación',
        'headers': ['Campo', 'Valor'],
        'rows': [
            ['Título', draft.title],
            ['Tipo de acto', draft.get_kind_display()],
            ['Tema', draft.get_topic_display()],
            ['Estado', draft.get_status_display()],
            ['Número del acto', draft.act_number or '—'],
            ['Fecha de expedición', _d(draft.issue_date)],
            ['Firmado por', draft.signed_by or '—'],
            ['Plantilla origen', draft.template.name if draft.template else '—'],
        ],
    }, {
        'heading': 'Contenido del acto',
        'description': 'Cuerpo del acto administrativo tras renderizar la plantilla.',
        'headers': ['Párrafo'],
        'rows': [[p] for p in (draft.content or '').split('\n') if p.strip()]
                or [['(Sin contenido. Genera el borrador desde la plantilla.)']],
    }]

    title = f'{draft.get_kind_display()} — {draft.title}'
    meta = _entity_meta(draft.entity, extras=[
        ('Módulo', 'M14 · Actos Administrativos'),
        ('Reestructuración', draft.restructuring.name),
        ('Estado', draft.get_status_display()),
    ])
    return title, meta, sections, 'acto', f'{draft.kind.lower()}_{draft.id}'


# ---------------------------------------------------------------------------
# M17 — MFMP (Marco Fiscal de Mediano Plazo)
# ---------------------------------------------------------------------------

def export_mfmp(mfmp) -> tuple:
    """
    mfmp: apps.mfmp.models.MFMP (con prefetch de incomes, expenses, debts).
    """
    from apps.mfmp.services import get_projection_matrix, calculate_law_617_by_year

    matrix = get_projection_matrix(mfmp)
    years = matrix['years']
    law_617 = calculate_law_617_by_year(mfmp)
    sections: list[Section] = []

    # Ingresos por concepto
    income_rows = []
    for concept, year_amounts in matrix['income_by_concept'].items():
        row = [concept]
        for yr in years:
            row.append(_d(Decimal(str(year_amounts.get(str(yr), 0)))))
        income_rows.append(row)
    sections.append({
        'heading': 'Ingresos por concepto',
        'description': 'Proyección de ingresos del MFMP por concepto y año.',
        'headers': ['Concepto'] + [str(yr) for yr in years],
        'rows': income_rows,
    })

    # Totales de ingresos
    sections.append({
        'heading': 'Totales ingresos',
        'headers': ['Año', 'Total ingresos'],
        'rows': [[yr, _d(Decimal(str(matrix['totals']['income'].get(str(yr), 0))))] for yr in years],
    })

    # Gastos por concepto
    expense_rows = []
    for concept, year_amounts in matrix['expense_by_concept'].items():
        row = [concept]
        for yr in years:
            row.append(_d(Decimal(str(year_amounts.get(str(yr), 0)))))
        expense_rows.append(row)
    sections.append({
        'heading': 'Gastos por concepto',
        'description': 'Proyección de gastos del MFMP por concepto y año.',
        'headers': ['Concepto'] + [str(yr) for yr in years],
        'rows': expense_rows,
    })

    # Deuda
    debt_rows = []
    for yr in years:
        d = matrix['debt'].get(str(yr), {})
        debt_rows.append([
            yr,
            _d(Decimal(str(d.get('outstanding_debt', 0)))),
            _d(Decimal(str(d.get('debt_service', 0)))),
            _d(Decimal(str(d.get('new_disbursements', 0)))),
        ])
    sections.append({
        'heading': 'Deuda',
        'headers': ['Año', 'Saldo deuda', 'Servicio deuda', 'Nuevos desembolsos'],
        'rows': debt_rows,
    })

    # Ley 617
    law_617_rows = []
    for yr in years:
        d = law_617.get(yr, {})
        law_617_rows.append([
            yr,
            _d(Decimal(str(d.get('icld', 0)))),
            _d(Decimal(str(d.get('funcionamiento', 0)))),
            f'{d.get("ratio", 0) * 100:.1f}%',
            f'{d.get("limit", 0) * 100:.0f}%',
            'Cumple' if d.get('compliant', True) else 'No cumple',
        ])
    sections.append({
        'heading': 'Indicadores Ley 617/2000',
        'description': 'ICLD, gastos funcionamiento y cumplimiento del límite por año.',
        'headers': ['Año', 'ICLD', 'Funcionamiento', 'Ratio', 'Límite', 'Cumplimiento'],
        'rows': law_617_rows,
        'notes': 'Ley 617/2000 — límite de gastos de funcionamiento sobre ICLD.',
    })

    title = f'MFMP — {mfmp.name}'
    meta = _entity_meta(mfmp.entity, extras=[
        ('Módulo', 'M17 · MFMP Ley 819'),
        ('Nombre MFMP', mfmp.name),
        ('Año base', str(mfmp.base_year)),
        ('Horizonte', f'{mfmp.horizon_years} años'),
        ('Aprobado por', mfmp.approved_by or '—'),
    ])
    return title, meta, sections, 'mfmp', f'{mfmp.base_year}'
