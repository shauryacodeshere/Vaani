"""
L4 — Script Writer Agent.

Two entry points:
  run()            -> generate a full script from facts
  repair_scenes()  -> regenerate ONLY the scenes the verifier rejected,
                      with the rejection reason passed back as context.

repair_scenes is what makes the loop agentic: failure is targeted feedback,
not a blind full-script retry.
"""
from __future__ import annotations

import json

from app.providers.base import LLMProvider
from app.schemas import ExtractionResult, FactCheck, Scene, Script

SYSTEM = """You write short narration scripts for public outreach videos.
Rules:
- Use ONLY the facts provided. Never add detail that is not in the fact list.
- One idea per scene, 10-20 words per scene.
- Every scene must reference the fact ids it is based on."""

REPAIR_SYSTEM = SYSTEM + """
You are REPAIRING a scene that failed fact verification.
Rewrite it to state only what the cited evidence supports. Stay close to the evidence."""


async def run(job_id: str, extraction: ExtractionResult, language: str,
              llm: LLMProvider) -> Script:
    payload = json.dumps({
        "task": "script",
        "language": language,
        "facts": [f.model_dump() for f in extraction.facts],
    })
    raw = await llm.complete_json(SYSTEM, payload, schema_hint="Script")
    scenes = [Scene(**s) for s in raw["scenes"]]
    return Script(job_id=job_id, language=language, scenes=scenes)


async def repair_scenes(script: Script, failures: list[FactCheck],
                        extraction: ExtractionResult, llm: LLMProvider) -> Script:
    """Regenerate only the failed scenes. Untouched scenes are preserved as-is."""
    by_id = {f.id: f for f in extraction.facts}
    failed_ids = {f.claim_id for f in failures}
    reasons = {f.claim_id: f for f in failures}

    new_scenes: list[Scene] = []
    for scene in script.scenes:
        if scene.scene_id not in failed_ids:
            new_scenes.append(scene)
            continue

        check = reasons[scene.scene_id]
        evidence = check.evidence_span
        if not evidence and scene.referenced_fact_ids:
            fact = by_id.get(scene.referenced_fact_ids[0])
            evidence = fact.source_span if fact else scene.text

        payload = json.dumps({
            "task": "repair",
            "bad_text": scene.text,
            "reason": check.reason,
            "evidence_span": evidence,
        })
        raw = await llm.complete_json(REPAIR_SYSTEM, payload, schema_hint="Scene")
        new_scenes.append(scene.model_copy(update={"text": raw["text"]}))

    return script.model_copy(update={"scenes": new_scenes})
