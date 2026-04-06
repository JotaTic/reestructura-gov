"""
Sistema de validadores legales declarativos (Sprint 4 — bloque 4.3).

Proporciona un registro global de reglas (RULES) que se cargan automáticamente
desde apps.common.rules al arrancar la aplicación.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Literal

Severity = Literal["error", "warning", "info"]


@dataclass
class Finding:
    rule_code: str
    severity: Severity
    message: str
    subject: str  # p.ej. "cargo:ASISTENCIAL 440-01", "proceso:P-001"
    context: dict = field(default_factory=dict)


@dataclass
class Rule:
    code: str
    name: str
    severity: Severity
    applies_to: Literal["entity", "restructuring"]
    description: str
    check: Callable  # (ctx: dict) -> list[Finding]


RULES: list[Rule] = []


def register(rule: Rule) -> Rule:
    RULES.append(rule)
    return rule
