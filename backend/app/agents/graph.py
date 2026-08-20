"""
L4 — Agent workflow.

    extract -> write -> verify -> [pass] -> done
                  ^        |
                  |        v
                repair  [fail, attempts < MAX]
                           |
                           v
                    [attempts exhausted] -> NEEDS_HUMAN_REVIEW

Written as explicit async functions with a state dict so it is debuggable
with a plain stack trace. Port to LangGraph nodes later if the graph grows —
the node boundaries below map 1:1 onto LangGraph nodes.
"""
from __future__ import annotations

import logging

from app.agents import extraction_agent, verifier_agent, writer_agent
from app.providers.base import LLMProvider
from app.schemas import (
    ExtractionResult,
    SourceDocument,
    VerifiedScript,
    Verdict,
)

log = logging.getLogger("vaanireach.agents")

MAX_ATTEMPTS = 3


async def extract(doc: SourceDocument, llm: LLMProvider) -> ExtractionResult:
    result = await extraction_agent.run(doc, llm)
    log.info("extracted %d facts from %s", len(result.facts), doc.doc_id)
    return result


async def write_and_verify(
    job_id: str,
    extraction: ExtractionResult,
    language: str,
    llm: LLMProvider,
    on_attempt=None,
) -> VerifiedScript:
    """Generate -> verify -> repair failed claims only -> re-verify. Bounded."""
    script = await writer_agent.run(job_id, extraction, language, llm)

    for attempt in range(1, MAX_ATTEMPTS + 1):
        checks = verifier_agent.verify_script(script, extraction, attempt=attempt)
        failures = [c for c in checks if c.verdict != Verdict.SUPPORTED]

        if on_attempt:
            on_attempt(language, attempt, len(failures))

        if not failures:
            log.info("[%s] verified clean on attempt %d", language, attempt)
            return VerifiedScript(script=script, checks=checks, status="APPROVED")

        if attempt == MAX_ATTEMPTS:
            log.warning("[%s] %d claim(s) unresolved after %d attempts -> human review",
                        language, len(failures), attempt)
            escalated = [
                c.model_copy(update={"verdict": Verdict.NEEDS_HUMAN_REVIEW})
                if c.verdict != Verdict.SUPPORTED else c
                for c in checks
            ]
            return VerifiedScript(script=script, checks=escalated,
                                  status="NEEDS_HUMAN_REVIEW")

        log.info("[%s] attempt %d: repairing %d failed claim(s)",
                 language, attempt, len(failures))
        script = await writer_agent.repair_scenes(script, failures, extraction, llm)

    raise AssertionError("unreachable")
