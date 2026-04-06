"""
Dataclasses / schemas para el motor de elegibilidad.
"""
from dataclasses import dataclass, field
from typing import Literal, Optional

EligibilityStatus = Literal["ELEGIBLE", "ELEGIBLE_POR_EQUIVALENCIA", "NO_ELEGIBLE"]


@dataclass
class PromotionEligibility:
    employee_id: int
    employee_name: str
    target_level: str
    target_code: str
    target_grade: str
    status: EligibilityStatus
    gap: list = field(default_factory=list)           # razones si no es elegible
    path_to_qualify: list = field(default_factory=list)  # sugerencias
    matched_education: Optional[str] = None
    total_public_experience_years: float = 0.0
    equivalence_applied: Optional[str] = None
