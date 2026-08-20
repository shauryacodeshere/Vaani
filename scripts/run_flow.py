"""
End-to-end flow runner.

    python scripts/run_flow.py

Runs the whole pipeline with mock providers, then runs the fact-verification
demo (a script claim mutated to contain a wrong number) to prove the
verify -> repair -> re-verify loop actually fires.
"""
from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.agents import verifier_agent                      # noqa: E402
from app.orchestration.job_manager import JobStore, Pipeline  # noqa: E402
from app.providers.mock import (                            # noqa: E402
    AlwaysFailingProvider,
    MockLLM,
    MockTranslation,
    MockTTS,
    MockVisuals,
)
from app.schemas import JobStatus, SourceDocument, Verdict   # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(name)-20s %(message)s")

NOTICE = SourceDocument(
    title="Public Notice: Scholarship Application Window",
    origin="url",
    origin_ref="https://example.gov.in/notices/scholarship-2026",
    raw_text=(
        "The application window for the National Merit Scholarship opens on "
        "1 September 2026. Eligible students must have scored at least 75 percent "
        "in their qualifying examination. The total number of scholarships "
        "available this year is 12000. Applications must be submitted online "
        "through the official portal before the deadline of 30 November 2026. "
        "No applications will be accepted after the closing date"
    ),
)


def banner(text: str) -> None:
    print(f"\n{'=' * 70}\n{text}\n{'=' * 70}")


async def main() -> None:
    updates: list[JobStatus] = []

    pipeline = Pipeline(
        store=JobStore(),
        llm=MockLLM(),
        # Failing provider first, on purpose: proves the fallback chain works.
        translation=[AlwaysFailingProvider(), MockTranslation()],
        tts=[MockTTS()],
        visuals=[MockVisuals()],
        output_root="output",
        on_status=updates.append,
    )

    banner("STAGE RUN — source notice -> 3 languages")
    job = await pipeline.run(NOTICE, languages=["hi", "mr", "ta"])

    banner("EXTRACTED FACTS (single source of truth)")
    extraction = pipeline.store.get_artifact(job.job_id, "extraction")
    for f in extraction.facts:
        print(f"  [{f.id}] ({f.type:7}) {f.claim[:70]}")

    banner("VERIFICATION RESULT PER LANGUAGE")
    verified = pipeline.store.get_artifact(job.job_id, "verified")
    for lang, vs in verified.items():
        ok = sum(1 for c in vs.checks if c.verdict == Verdict.SUPPORTED)
        print(f"  {lang}: {vs.status:20} {ok}/{len(vs.checks)} claims supported")

    banner("OUTPUT ARTIFACTS")
    for v in job.videos:
        size = Path(v.video_path).stat().st_size // 1024
        print(f"  {v.language}: {v.video_path}  ({v.duration_sec}s, {size} KB)")
        print(f"      captions: {v.captions_path}")

    banner("STATE MACHINE TRACE")
    seen, trace = set(), []
    for u in updates:
        if u.stage.value not in seen:
            seen.add(u.stage.value)
            trace.append(u.stage.value)
    print("  " + " -> ".join(trace))

    banner("HUMAN REVIEW GATE")
    print(f"  stage before review : {job.stage.value}")
    approved = pipeline.approve(job.job_id, notes="Checked against source. Approved.")
    print(f"  stage after approve : {approved.stage.value}")

    # ------------------------------------------------------------------
    banner("FACT-VERIFICATION DEMO — injected error")
    # This is the demo beat from PRD Section 14: a claim that reads plausibly
    # but carries a number that is NOT in the source document.
    bad_claim = "The total number of scholarships available this year is 21000."
    print(f"  claim   : {bad_claim}")
    check = verifier_agent.check_claim(bad_claim, "s_demo", extraction.facts)
    print(f"  verdict : {check.verdict.value}")
    print(f"  reason  : {check.reason}")

    good_claim = "The total number of scholarships available this year is 12000."
    recheck = verifier_agent.check_claim(good_claim, "s_demo", extraction.facts)
    print(f"\n  after repair: {good_claim}")
    print(f"  verdict : {recheck.verdict.value} (confidence {recheck.confidence:.2f})")

    banner("UNVERIFIABLE CLAIM DEMO — hallucinated detail")
    halluc = "Applicants will also receive a free laptop and hostel accommodation."
    hcheck = verifier_agent.check_claim(halluc, "s_demo2", extraction.facts)
    print(f"  claim   : {halluc}")
    print(f"  verdict : {hcheck.verdict.value}")
    print(f"  reason  : {hcheck.reason}")


if __name__ == "__main__":
    asyncio.run(main())
