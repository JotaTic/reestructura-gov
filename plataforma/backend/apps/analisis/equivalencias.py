"""
Decreto 785/2005 art. 25 — Equivalencias territoriales (simplificado pero funcional).
Cada nivel define: años mínimos de educación formal + años mínimos de experiencia
y las equivalencias permitidas (estudios ↔ experiencia).
"""

LEVEL_REQUIREMENTS = {
    "ASISTENCIAL": {
        "min_education": "BACHILLERATO",  # o titulo técnico según grado
        "min_experience_years": 0,
        "preferred_experience_years": 1,
    },
    "TECNICO": {
        "min_education": "TECNICO",  # o bachillerato + experiencia
        "min_experience_years": 1,
        "preferred_experience_years": 2,
    },
    "PROFESIONAL": {
        "min_education": "PREGRADO",  # o tecnólogo + experiencia (equivalencia)
        "min_experience_years": 0,
        "preferred_experience_years": 1,
    },
    "ASESOR": {
        "min_education": "PREGRADO",
        "min_experience_years": 4,
        "preferred_experience_years": 6,
    },
    "DIRECTIVO": {
        "min_education": "PREGRADO",
        "min_experience_years": 4,
        "preferred_experience_years": 6,
    },
}

# Orden jerárquico para comparar
EDUCATION_ORDER = [
    "PRIMARIA", "BACHILLERATO", "TECNICO", "TECNOLOGO",
    "PREGRADO", "ESPECIALIZACION", "MAESTRIA", "DOCTORADO"
]

# Equivalencias autorizadas (fuente: D-785/2005 art. 25, interpretación simplificada)
# Cada entrada dice: "si el empleado tiene X, se le acepta como Y cuando le aporta Z años extra de experiencia"
EQUIVALENCIAS = [
    # Tecnólogo titulado + 2 años exp profesional ↔ Pregrado (solo para entrar a nivel profesional)
    {"have": "TECNOLOGO", "grants": "PREGRADO", "extra_experience_years": 2, "applies_to": ["PROFESIONAL"]},
    # Bachiller + 4 años experiencia específica ↔ Técnico
    {"have": "BACHILLERATO", "grants": "TECNICO", "extra_experience_years": 4, "applies_to": ["TECNICO"]},
    # Técnico + 2 años experiencia ↔ Tecnólogo (usable como Pregrado si suma más años)
    {"have": "TECNICO", "grants": "TECNOLOGO", "extra_experience_years": 2, "applies_to": ["TECNICO", "PROFESIONAL"]},
    # Pregrado + Especialización ↔ se considera maestría para grados avanzados
    {"have": "ESPECIALIZACION", "grants": "MAESTRIA", "extra_experience_years": 0, "applies_to": ["DIRECTIVO", "ASESOR"]},
]
