"""
Motor de matching para Jota.

Normaliza la pregunta y las keywords (minúsculas + sin tildes) y aplica:

1.  **Match por subcadena** de la frase completa (compatibilidad hacia atrás
    con los keywords ya escritos como frases).
2.  **Match por conjunto de tokens con stemming ligero español**: tokeniza
    tanto la pregunta como el keyword, aplica un stemmer por reglas (quita
    desinencias verbales y plurales comunes) y considera que un keyword hace
    match si *todos* sus tokens stemmed están contenidos en el conjunto de
    tokens stemmed de la pregunta.

De esta manera "¿cómo creo una entidad?" matchea el keyword "crear entidad",
"matrices" matchea "matriz", "genero el manual" matchea "generar manual", etc.

Cache en memoria invalidable desde JotaIntent.save()/delete().
"""
from __future__ import annotations

import re
import unicodedata
from threading import Lock
from typing import Optional

_cache_lock = Lock()
_intents_cache: list[dict] | None = None


# ---------------------------------------------------------------------------
# Normalización y stemming
# ---------------------------------------------------------------------------

# Palabras muy frecuentes que no aportan al matching (se eliminan de los
# conjuntos de tokens tanto del keyword como de la pregunta).
_STOPWORDS: set[str] = {
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'dela', 'delos', 'delas',
    'al', 'a', 'en', 'y', 'o', 'u', 'es', 'son', 'para', 'por', 'con',
    'sin', 'que', 'cual', 'cuales', 'cuando', 'como', 'donde', 'quien',
    'quienes', 'se', 'su', 'sus', 'mi', 'tu', 'yo', 'me', 'te', 'nos',
    'esto', 'eso', 'esta', 'este', 'estos', 'estas', 'ese', 'esa', 'esos',
    'esas', 'hay', 'ha', 'he', 'has', 'han', 'sobre', 'mas', 'muy', 'ya',
    'lo', 'le', 'les', 'si', 'no', 'pero', 'tambien', 'tampoco',
    # Tokens "ayuda" frecuentes en preguntas a un bot — no deben dominar
    # el matching pero tampoco deben romperlo.
    'quiero', 'quisiera', 'necesito', 'deseo', 'puedo', 'podria', 'debo',
    'hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches', 'porfavor',
    'favor', 'gracias',
}

# Sufijos a intentar remover en orden (los más largos primero). Son reglas
# conservadoras: solo se aplican si el stem resultante conserva al menos
# 3 caracteres. Esto cubre la mayoría de verbos regulares y plurales.
_SUFFIXES: tuple[str, ...] = (
    'aciones', 'iciones', 'uciones',
    'acion', 'icion', 'ucion',
    'amiento', 'imiento',
    'andolo', 'iendolo', 'andola', 'iendola',
    'andome', 'iendome',
    'abamos', 'iamos', 'eramos',
    'aremos', 'eremos', 'iremos',
    'ariais', 'eriais', 'iriais',
    'arian', 'erian', 'irian',
    'aria', 'eria', 'iria',
    'ando', 'iendo',
    'adas', 'idas', 'ados', 'idos',
    'amos', 'emos', 'imos',
    'aban', 'ian',
    'aba', 'ia',
    'ada', 'ida', 'ado', 'ido',
    'aran', 'eran', 'iran',
    'ara', 'era', 'ira',
    'are', 'ere', 'ire',
    'mos',
    'ar', 'er', 'ir',
    'as', 'es', 'os',
    'an', 'en',
    'a', 'o', 'e', 's',
)


def normalize(text: str) -> str:
    """Minúsculas, sin tildes, solo letras/números/espacios."""
    if not text:
        return ''
    text = text.lower()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r'[^a-z0-9ñü\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def stem(word: str) -> str:
    """
    Stemmer ligero por reglas para español.

    - Mantiene palabras de ≤ 2 caracteres tal cual.
    - Remueve el sufijo más largo aplicable de `_SUFFIXES` siempre que
      queden al menos 3 caracteres en el stem.
    - Normaliza la alternancia final z→c (matriz/matrices, luz/luces,
      pez/peces) para que singulares y plurales colapsen en el mismo stem.
    """
    if len(word) <= 2:
        return word
    for suf in _SUFFIXES:
        if word.endswith(suf) and len(word) - len(suf) >= 3:
            word = word[: -len(suf)]
            break
    if len(word) >= 3 and word.endswith('z'):
        word = word[:-1] + 'c'
    return word


def _tokenize(text: str) -> list[str]:
    """Devuelve los tokens stemmed, sin stopwords ni vacíos."""
    norm = normalize(text)
    if not norm:
        return []
    out: list[str] = []
    for tok in norm.split():
        if not tok or tok in _STOPWORDS:
            continue
        out.append(stem(tok))
    return out


# ---------------------------------------------------------------------------
# Carga de intents y cache
# ---------------------------------------------------------------------------

def _split_keywords(raw: str) -> list[dict]:
    """
    Devuelve una lista de *keyword-entries*, uno por frase-keyword separada
    por comas o saltos de línea. Cada entry contiene:

    - `raw_norm`: la frase normalizada completa (para match por subcadena).
    - `tokens`:   el conjunto de tokens stemmed (para match por tokens).
    - `length`:   longitud de la frase normalizada (para desempatar por
                  especificidad).
    """
    if not raw:
        return []
    parts = re.split(r'[,\n]', raw)
    entries: list[dict] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        raw_norm = normalize(p)
        if not raw_norm:
            continue
        tokens = set(_tokenize(p))
        entries.append({
            'raw_norm': raw_norm,
            'tokens': tokens,
            'length': len(raw_norm),
        })
    return entries


def invalidate_cache() -> None:
    global _intents_cache
    with _cache_lock:
        _intents_cache = None


def _load_intents() -> list[dict]:
    global _intents_cache
    with _cache_lock:
        if _intents_cache is not None:
            return _intents_cache
        from .models import JotaIntent
        intents: list[dict] = []
        for it in JotaIntent.objects.filter(is_active=True).order_by('-priority', 'id'):
            intents.append({
                'id': it.id,
                'slug': it.slug,
                'name': it.name,
                'answer': it.answer,
                'priority': it.priority,
                'keywords': _split_keywords(it.keywords),
            })
        _intents_cache = intents
        return intents


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------

def _keyword_matches(
    kw: dict,
    q_norm: str,
    q_tokens: set[str],
) -> tuple[bool, int]:
    """
    Evalúa si un keyword hace match contra la pregunta.

    Devuelve (matched, specificity):
      - matched: True/False
      - specificity: medida de "qué tan fuerte" es el match (para
        desempatar entre intents). Mayor = mejor.
    """
    kw_tokens = kw['tokens']
    meaningful = len(kw_tokens)  # nº de tokens significativos (sin stopwords)

    # (1) Match por subcadena: el keyword aparece literalmente en la pregunta.
    #     El bonus escala con el número de tokens *significativos* del keyword,
    #     de modo que una frase compuesta solo por stopwords (ej. "que es")
    #     no aporta score. Los keywords "reales" sí dominan por especificidad.
    if kw['raw_norm'] and kw['raw_norm'] in q_norm:
        return True, kw['length'] + 500 * meaningful

    # (2) Match por tokens stemmed: *todos* los tokens del keyword deben
    #     estar presentes en la pregunta.
    if not kw_tokens:
        return False, 0
    if kw_tokens.issubset(q_tokens):
        # Especificidad proporcional a cuántos tokens tiene el keyword y
        # a su longitud: keywords largos y con más términos son más
        # específicos y pesan más.
        return True, meaningful * 10 + kw['length']

    return False, 0


def find_intent(question: str) -> Optional[dict]:
    """
    Devuelve el intent con mejor score para una pregunta, o None si ninguno
    tiene al menos una coincidencia.

    Desempates (en orden):
      1. score  — suma de especificidades de los keywords que matchean.
      2. priority descendente.
      3. id ascendente (estable).
    """
    if not question:
        return None
    q_norm = normalize(question)
    if not q_norm:
        return None
    q_tokens = set(_tokenize(question))

    best: Optional[tuple[int, int, int, dict]] = None
    for intent in _load_intents():
        total_score = 0
        matched_any = False
        for kw in intent['keywords']:
            matched, spec = _keyword_matches(kw, q_norm, q_tokens)
            if matched:
                matched_any = True
                total_score += spec
        if not matched_any:
            continue
        # Queremos maximizar (score, priority) y minimizar id.
        key = (total_score, intent['priority'], -intent['id'], intent)
        if best is None or key > best:
            best = key
    if best is None:
        return None
    return best[3]
