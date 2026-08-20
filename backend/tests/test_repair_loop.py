"""
Proves the agentic loop is real, not decorative.

A "sloppy writer" LLM injects a wrong number on its first attempt and only
writes grounded text when given repair feedback. If the loop works, the job
recovers. A second variant never corrects itself, and must escalate to a human
instead of silently publishing.
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents import graph                       # noqa: E402
from app.providers.mock import MockLLM             # noqa: E402
from app.schemas import SourceDocument, Verdict    # noqa: E402

DOC = SourceDocument(
    title="Notice",
    raw_text=("The total number of scholarships available this year is 12000. "
              "The deadline for applications is 30 November 2026"),
)


class SloppyWriter(MockLLM):
    """Gets a number wrong first, fixes it when the verifier pushes back."""
    name = "sloppy-writer"

    def __init__(self, incorrigible: bool = False):
        self.incorrigible = incorrigible

    async def complete_json(self, system, user, schema_hint):
        payload = json.loads(user)
        if payload["task"] == "script":
            out = await super().complete_json(system, user, schema_hint)
            out["scenes"][0]["text"] = (
                "The total number of scholarships available this year is 99999."
            )
            return out
        if payload["task"] == "repair" and self.incorrigible:
            return {"text": "The total number of scholarships available this year is 88888."}
        return await super().complete_json(system, user, schema_hint)


async def run_case(llm) -> tuple[str, list[int]]:
    extraction = await graph.extract(DOC, MockLLM())
    attempts: list[int] = []
    vs = await graph.write_and_verify(
        "job_test", extraction, "en", llm,
        on_attempt=lambda lang, attempt, failed: attempts.append(failed),
    )
    return vs.status, attempts, vs


async def main() -> None:
    print("CASE 1 — writer errs once, then repairs")
    status, attempts, vs = await run_case(SloppyWriter())
    print(f"  failures per attempt : {attempts}")
    print(f"  final status         : {status}")
    print(f"  repaired scene text  : {vs.script.scenes[0].text}")
    assert attempts[0] == 1, "verifier should have caught the bad number"
    assert status == "APPROVED", "loop should recover after repair"
    assert len(attempts) == 2, "should pass on the second attempt"
    print("  PASS — caught, repaired, re-verified\n")

    print("CASE 2 — writer never corrects itself")
    status, attempts, vs = await run_case(SloppyWriter(incorrigible=True))
    print(f"  failures per attempt : {attempts}")
    print(f"  final status         : {status}")
    flagged = [c for c in vs.checks if c.verdict == Verdict.NEEDS_HUMAN_REVIEW]
    print(f"  flagged for human    : {len(flagged)} claim(s)")
    print(f"  reason               : {flagged[0].reason[:80]}")
    assert status == "NEEDS_HUMAN_REVIEW", "must escalate, never silently publish"
    assert len(attempts) == graph.MAX_ATTEMPTS, "must respect the retry cap"
    print("  PASS — bounded retries, escalated to human\n")

    print("All loop guarantees hold.")


if __name__ == "__main__":
    asyncio.run(main())
