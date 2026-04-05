from __future__ import annotations

from .matching import find_intent
from .models import JotaSettings


def answer_question(question: str) -> dict:
    """
    Fachada para el endpoint /ask/: aplica el motor de matching y resuelve
    con fallback cuando no hay coincidencias.
    """
    question = (question or '').strip()[:500]  # límite defensivo
    if not question:
        settings = JotaSettings.get_solo()
        return {
            'answer': settings.fallback_message,
            'matched_intent': None,
        }

    intent = find_intent(question)
    if intent is None:
        settings = JotaSettings.get_solo()
        return {
            'answer': settings.fallback_message,
            'matched_intent': None,
        }
    return {
        'answer': intent['answer'],
        'matched_intent': intent['slug'],
    }


def get_public_config() -> dict:
    settings = JotaSettings.get_solo()
    suggestions = [
        line.strip()
        for line in (settings.suggested_questions or '').splitlines()
        if line.strip()
    ]
    return {
        'is_enabled': settings.is_enabled,
        'bot_name': settings.bot_name,
        'welcome_message': settings.welcome_message,
        'fallback_message': settings.fallback_message,
        'suggested_questions': suggestions,
        'position': settings.position,
        'primary_color': settings.primary_color,
    }
