"""
Generador consolidado del estudio técnico (Sprint 4 — bloque 4.4).

Arma un único DOCX con los 12 capítulos de la Cartilla de Función Pública.
Reutiliza apps.common.exports.build_docx.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.core.models import Restructuring


def build_technical_study(restructuring: 'Restructuring') -> bytes:
    """
    Arma un único DOCX con los 12 capítulos de la Cartilla.
    Si un dato no existe, incluye el capítulo con "(sin información cargada)".
    Devuelve bytes.
    """
    from datetime import date
    from apps.common.exports import build_docx

    entity = restructuring.entity
    title = f'Estudio Técnico de Reestructuración — {entity.name}'
    meta = [
        ('Entidad', entity.name),
        ('Sigla', entity.acronym or '—'),
        ('Reestructuración', restructuring.name),
        ('Fecha de referencia', str(restructuring.reference_date)),
        ('Estado', restructuring.get_status_display()),
        ('Generado', str(date.today())),
    ]

    sections = []

    # ---- Cap 1: Identificación ----
    sections.append({
        'heading': 'Capítulo 1 — Identificación de la Entidad',
        'description': 'Datos generales de la entidad sujeta a reestructuración.',
        'headers': ['Campo', 'Valor'],
        'rows': [
            ['Nombre', entity.name],
            ['Sigla', entity.acronym or '—'],
            ['Orden', entity.get_order_display()],
            ['Categoría municipal', entity.get_municipality_category_display()],
            ['Naturaleza jurídica', entity.get_legal_nature_display()],
            ['NIT', entity.nit or '—'],
            ['Acto estructura vigente', entity.current_structure_act or '—'],
            ['Acto planta vigente', entity.current_payroll_act or '—'],
            ['Acto manual vigente', entity.current_manual_act or '—'],
        ],
    })

    # ---- Cap 2: Objetivos ----
    objectives = list(restructuring.objectives.all())
    if objectives:
        rows = [
            [
                obj.get_kind_display(),
                obj.description or '—',
                obj.indicator or '—',
                str(obj.deadline) if obj.deadline else '—',
            ]
            for obj in objectives
        ]
    else:
        rows = []
    sections.append({
        'heading': 'Capítulo 2 — Objetivos de la Reestructuración',
        'description': '(sin información cargada)' if not rows else '',
        'headers': ['Tipo de objetivo', 'Descripción', 'Indicador', 'Fecha límite'],
        'rows': rows,
    })

    # ---- Cap 3: Marco legal ----
    try:
        from apps.legal.models import LegalNorm
        from apps.mandatos.models import LegalMandate
        norms = LegalNorm.objects.all().order_by('-year', 'reference')[:50]
        mandates = LegalMandate.objects.filter(entity=entity)[:50]
        rows_norms = [[n.reference, n.title, str(n.year), n.summary[:120]] for n in norms]
        rows_mandates = [[m.norm, m.article or '—', m.mandate_text[:120]] for m in mandates]
        sections.append({
            'heading': 'Capítulo 3 — Marco Legal',
            'description': 'Normas de referencia y mandatos legales aplicables.',
            'headers': ['Norma', 'Título', 'Año', 'Resumen'],
            'rows': rows_norms or [],
        })
        sections.append({
            'heading': 'Cap 3B — Mandatos Legales',
            'headers': ['Norma', 'Artículo', 'Texto del mandato'],
            'rows': rows_mandates or [],
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 3 — Marco Legal',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 4: Diagnóstico ----
    try:
        from apps.diagnostico.models import Diagnosis
        diagnoses = Diagnosis.objects.filter(restructuring=restructuring)
        rows_diag = []
        rows_dofa = []
        for d in diagnoses:
            rows_diag.append([d.name, str(d.reference_date), d.mission[:100]])
            for item in d.swot_items.all():
                rows_dofa.append([
                    d.name, item.get_type_display(),
                    item.get_dimension_display(), item.description[:100],
                ])
        sections.append({
            'heading': 'Capítulo 4 — Diagnóstico',
            'description': '(sin información cargada)' if not rows_diag else '',
            'headers': ['Nombre', 'Fecha', 'Misión'],
            'rows': rows_diag,
        })
        sections.append({
            'heading': 'Cap 4B — DOFA',
            'headers': ['Diagnóstico', 'Tipo', 'Dimensión', 'Descripción'],
            'rows': rows_dofa,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 4 — Diagnóstico',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 5: Financiero / MFMP ----
    try:
        from apps.mfmp.models import MFMP
        mfmps = MFMP.objects.filter(entity=entity)
        rows_mfmp = [[m.name, str(m.base_year), str(m.created_at.date())] for m in mfmps]
        sections.append({
            'heading': 'Capítulo 5 — Marco Fiscal de Mediano Plazo',
            'description': '(sin información cargada)' if not rows_mfmp else '',
            'headers': ['Nombre MFMP', 'Año base', 'Fecha creación'],
            'rows': rows_mfmp,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 5 — Marco Fiscal de Mediano Plazo',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 6: Estructura orgánica ----
    try:
        from apps.core.models import Department
        depts = Department.objects.filter(entity=entity).select_related('parent')
        rows_depts = [
            [d.code or '—', d.name, d.parent.name if d.parent else '(raíz)', str(d.order)]
            for d in depts
        ]
        sections.append({
            'heading': 'Capítulo 6 — Estructura Orgánica',
            'description': '(sin información cargada)' if not rows_depts else '',
            'headers': ['Código', 'Dependencia', 'Dependencia padre', 'Orden'],
            'rows': rows_depts,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 6 — Estructura Orgánica',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 7: Matriz de cargas ----
    try:
        from apps.cargas.models import WorkloadMatrix, WorkloadEntry
        matrices = WorkloadMatrix.objects.filter(restructuring=restructuring)
        rows_cargas = []
        for mx in matrices:
            for entry in mx.entries.select_related('department').all()[:100]:
                rows_cargas.append([
                    entry.department.name if entry.department else '—',
                    entry.hierarchy_level,
                    entry.job_denomination,
                    entry.process,
                    entry.activity[:80],
                    float(entry.hh_month),
                ])
        sections.append({
            'heading': 'Capítulo 7 — Matriz de Cargas de Trabajo',
            'description': '(sin información cargada)' if not rows_cargas else '',
            'headers': ['Dependencia', 'Nivel', 'Cargo', 'Proceso', 'Actividad', 'H-H/mes'],
            'rows': rows_cargas,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 7 — Matriz de Cargas de Trabajo',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 8: Planta de personal ----
    try:
        from apps.planta.models import PayrollPlan, PayrollPosition
        plans = PayrollPlan.objects.filter(restructuring=restructuring)
        rows_planta = []
        for plan in plans:
            for pos in plan.positions.all():
                rows_planta.append([
                    plan.get_kind_display(),
                    plan.name,
                    pos.hierarchy_level,
                    pos.code or '—',
                    pos.grade or '—',
                    pos.denomination,
                    pos.quantity,
                    float(pos.monthly_salary),
                ])
        sections.append({
            'heading': 'Capítulo 8 — Planta de Personal',
            'description': '(sin información cargada)' if not rows_planta else '',
            'headers': ['Tipo', 'Plan', 'Nivel', 'Código', 'Grado', 'Denominación', 'Cantidad', 'Salario'],
            'rows': rows_planta,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 8 — Planta de Personal',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 9: Manual de funciones ----
    try:
        from apps.manual_legacy.models import LegacyManual, LegacyManualRole
        manuals = LegacyManual.objects.filter(entity=entity)
        rows_manual = []
        for manual in manuals:
            for role in manual.roles.all():
                rows_manual.append([
                    manual.name,
                    role.level,
                    role.code or '—',
                    role.grade or '—',
                    role.denomination,
                ])
        sections.append({
            'heading': 'Capítulo 9 — Manual de Funciones',
            'description': '(sin información cargada)' if not rows_manual else '',
            'headers': ['Manual', 'Nivel', 'Código', 'Grado', 'Denominación'],
            'rows': rows_manual,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 9 — Manual de Funciones',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 10: Retén social ----
    try:
        from apps.reten.models import ProtectedEmployee
        protected = ProtectedEmployee.objects.filter(entity=entity, active=True)
        rows_reten = [
            [pe.full_name, pe.id_number, pe.get_protection_type_display(), pe.evidence[:100]]
            for pe in protected
        ]
        sections.append({
            'heading': 'Capítulo 10 — Retén Social',
            'description': '(sin información cargada)' if not rows_reten else '',
            'headers': ['Nombre', 'Documento', 'Tipo protección', 'Soporte'],
            'rows': rows_reten,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 10 — Retén Social',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 11: Elegibilidad ----
    try:
        from apps.core.models import RestructuringObjective
        has_nivelacion = restructuring.objectives.filter(
            kind='NIVELACION_SALARIAL'
        ).exists()
        if has_nivelacion:
            from .services import bulk_analyze_level
            result = bulk_analyze_level(entity, 'TECNICO', 'PROFESIONAL')
            rows_eleg = [
                [
                    r['employee_name'],
                    r['status'],
                    '; '.join(r['gap']) if r['gap'] else '—',
                    r['equivalence_applied'] or '—',
                ]
                for r in result['results']
            ]
        else:
            rows_eleg = []
        sections.append({
            'heading': 'Capítulo 11 — Elegibilidad para Nivelación',
            'description': (
                '(sin información cargada)'
                if not rows_eleg
                else f"Total analizados: {len(rows_eleg)}"
            ),
            'headers': ['Empleado', 'Estado', 'Brechas', 'Equivalencia aplicada'],
            'rows': rows_eleg,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 11 — Elegibilidad para Nivelación',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Cap 12: Acto administrativo ----
    try:
        from apps.actos.models import ActDraft
        drafts = ActDraft.objects.filter(restructuring=restructuring)
        rows_actos = [
            [d.title, d.get_kind_display(), d.get_topic_display(), d.get_status_display()]
            for d in drafts
        ]
        sections.append({
            'heading': 'Capítulo 12 — Actos Administrativos',
            'description': '(sin información cargada)' if not rows_actos else '',
            'headers': ['Título', 'Tipo', 'Tema', 'Estado'],
            'rows': rows_actos,
        })
    except Exception:
        sections.append({
            'heading': 'Capítulo 12 — Actos Administrativos',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    # ---- Anexos: documentos adjuntos ----
    try:
        from django.contrib.contenttypes.models import ContentType
        from apps.documentos.models import Document
        docs = Document.objects.filter(restructuring=restructuring)
        rows_docs = [
            [d.title, d.get_kind_display(), d.mime or '—', str(d.size or 0)]
            for d in docs
        ]
        sections.append({
            'heading': 'Anexos — Documentos Adjuntos',
            'description': '(sin información cargada)' if not rows_docs else '',
            'headers': ['Título', 'Tipo', 'MIME', 'Tamaño (bytes)'],
            'rows': rows_docs,
        })
    except Exception:
        sections.append({
            'heading': 'Anexos — Documentos Adjuntos',
            'description': '(sin información cargada)',
            'headers': ['Campo'],
            'rows': [],
        })

    return build_docx(title, meta, sections)
