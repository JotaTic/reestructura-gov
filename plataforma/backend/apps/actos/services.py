"""
Renderizado de plantillas de actos administrativos.

Usa str.format_map con un diccionario defaultivo para que los placeholders
ausentes queden como [VARIABLE] y el usuario los complete manualmente.
"""
from datetime import date
from typing import Any

from apps.core.models import Entity

from .models import ActDraft, ActTemplate


def render_act_content(draft: ActDraft) -> str:
    """Return the draft content with placeholders resolved from entity/restructuring."""
    replacements = {
        '{entity_name}': draft.entity.name if draft.entity else '',
        '{restructuring_name}': draft.restructuring.name if draft.restructuring else '',
        '{date}': draft.issue_date.isoformat() if draft.issue_date else date.today().isoformat(),
        '{act_number}': draft.act_number or '[SIN NÚMERO]',
        '{signed_by}': draft.signed_by or '[POR DEFINIR]',
        '{entity_nit}': draft.entity.nit if draft.entity else '',
        '{entity_acronym}': draft.entity.acronym if draft.entity else '',
        '{today}': date.today().isoformat(),
        '{today_long}': date.today().strftime('%d de %B de %Y'),
    }
    content = draft.content
    for placeholder, value in replacements.items():
        content = content.replace(placeholder, value)
    return content


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return '[' + key + ']'


def build_context(entity: Entity, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Contexto base para renderizar un acto de una entidad. Puede extenderse
    con información de planta, diagnóstico, etc. vía `extra`.
    """
    ctx: dict[str, Any] = {
        'entity_name': entity.name,
        'entity_acronym': entity.acronym or '',
        'entity_order': entity.get_order_display(),
        'entity_legal_nature': entity.get_legal_nature_display(),
        'entity_nit': entity.nit or '',
        'creation_norm': entity.creation_norm or '',
        'current_structure_act': entity.current_structure_act or '',
        'current_payroll_act': entity.current_payroll_act or '',
        'current_manual_act': entity.current_manual_act or '',
        'problem_statement': entity.problem_statement or '',
        'objectives': entity.objectives or '',
        'approach': entity.approach or '',
        'risks': entity.risks or '',
        'today': date.today().isoformat(),
        'today_long': date.today().strftime('%d de %B de %Y'),
    }
    if extra:
        ctx.update(extra)
    return ctx


def render_template(template: ActTemplate, context: dict[str, Any]) -> str:
    safe = _SafeDict(context)
    try:
        return template.body.format_map(safe)
    except (ValueError, KeyError):
        # Si hay llaves mal formadas, devolvemos el texto plano para no romper.
        return template.body


def create_draft_from_template(
    template: ActTemplate,
    entity: Entity,
    title: str,
    restructuring=None,
    extra_context: dict[str, Any] | None = None,
) -> ActDraft:
    ctx = build_context(entity, extra_context)
    return ActDraft.objects.create(
        entity=entity,
        restructuring=restructuring,
        template=template,
        title=title,
        kind=template.kind,
        topic=template.topic,
        content=render_template(template, ctx),
        status=ActDraft.Status.DRAFT,
    )
