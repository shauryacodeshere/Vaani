"""
L4 — Verifier Agent.

Two-step, deliberately: cheap retrieval first, expensive reasoning second.

  1. RETRIEVE  top-k candidate source facts for a claim.
               Skeleton: lexical overlap. Production: pgvector cosine similarity
               over fact_embeddings (same interface, swap retrieve_top_k).
  2. ENTAIL    check the claim against ONLY those candidates.

Strict types (date/number/name/location) additionally require exact token match:
a semantically similar sentence with the wrong number is the single most
dangerous failure mode for an official-notice pipeline, and embedding
similarity alone will happily wave it through.
"""
from __future__ import annotations

import re

from app.schemas import (
    STRICT_FACT_TYPES,
    ExtractionResult,
    Fact,
    FactCheck,
    Script,
    Verdict,
)

_STOP = {"the", "a", "an", "of", "to", "for", "and", "in", "on", "is", "are",
         "will", "be", "by", "with", "from", "at", "as", "that", "this"}

_NUM_RE = re.compile(r"\b\d[\d,]*\.?\d*\b")
_DATE_RE = re.compile(
    r"\b(?:\d{1,2}\s+)?(?:january|february|march|april|may|june|july|august|"
    r"september|october|november|december)\s*\d{0,4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
    re.I,
)


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in _STOP}


def _similarity(a: str, b: str) -> float:
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def retrieve_top_k(claim: str, facts: list[Fact], k: int = 3) -> list[tuple[Fact, float]]:
    """Swap this for a pgvector similarity query — signature stays identical."""
    scored = [(f, _similarity(claim, f.claim + " " + f.source_span)) for f in facts]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:k]


def _strict_tokens(text: str) -> set[str]:
    """Numbers and dates that must survive verbatim into the script."""
    out = {m.group().lower().replace(",", "") for m in _NUM_RE.finditer(text)}
    out |= {m.group().lower() for m in _DATE_RE.finditer(text)}
    return out


def check_claim(claim_text: str, scene_id: str, facts: list[Fact],
                attempt: int = 1, threshold: float = 0.30) -> FactCheck:
    candidates = retrieve_top_k(claim_text, facts)

    if not candidates or candidates[0][1] < threshold:
        return FactCheck(
            claim_id=scene_id, claim_text=claim_text,
            verdict=Verdict.UNVERIFIABLE, confidence=candidates[0][1] if candidates else 0.0,
            reason="No source fact supports this statement.", attempt=attempt,
        )

    best, score = candidates[0]

    # Strict check: every number/date in the claim must appear in the evidence.
    claim_strict = _strict_tokens(claim_text)
    evidence_strict = _strict_tokens(best.source_span)
    unsupported = claim_strict - evidence_strict

    if unsupported:
        return FactCheck(
            claim_id=scene_id, claim_text=claim_text,
            verdict=Verdict.CONTRADICTED, confidence=score,
            evidence_span=best.source_span, evidence_fact_id=best.id,
            reason=(f"Value(s) {sorted(unsupported)} do not appear in the source. "
                    f"Source states: '{best.source_span.strip()}'"),
            attempt=attempt,
        )

    # Strict-typed facts need a high bar even when no explicit number is present.
    if best.type in STRICT_FACT_TYPES and score < 0.5:
        return FactCheck(
            claim_id=scene_id, claim_text=claim_text,
            verdict=Verdict.UNVERIFIABLE, confidence=score,
            evidence_span=best.source_span, evidence_fact_id=best.id,
            reason=f"Weak support for a {best.type} claim.", attempt=attempt,
        )

    return FactCheck(
        claim_id=scene_id, claim_text=claim_text,
        verdict=Verdict.SUPPORTED, confidence=score,
        evidence_span=best.source_span, evidence_fact_id=best.id,
        reason="", attempt=attempt,
    )


def verify_script(script: Script, extraction: ExtractionResult,
                  attempt: int = 1) -> list[FactCheck]:
    return [
        check_claim(scene.text, scene.scene_id, extraction.facts, attempt=attempt)
        for scene in script.scenes
    ]
