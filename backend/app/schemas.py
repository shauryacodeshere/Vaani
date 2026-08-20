"""
VaaniReach shared contracts (PRD Section 6).

LOCKED AT T+0. Do not change without telling the whole team —
every layer and every feature branch codes against these shapes.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# L1 — Source document
# --------------------------------------------------------------------------

class SourceDocument(BaseModel):
    doc_id: str = Field(default_factory=lambda: _uid("doc"))
    title: str
    raw_text: str
    origin: str = "upload"          # "upload" | "url"
    origin_ref: str | None = None   # filename or source URL


# --------------------------------------------------------------------------
# L4 — Facts (extraction agent output)
# --------------------------------------------------------------------------

FactType = Literal["date", "number", "name", "policy", "location", "other"]

# Claim types that require exact-match verification, not semantic similarity.
STRICT_FACT_TYPES: set[str] = {"date", "number", "name", "location"}


class Fact(BaseModel):
    id: str
    claim: str
    type: FactType = "other"
    source_span: str  # verbatim text this claim came from — mandatory, it is the evidence


class ExtractionResult(BaseModel):
    doc_id: str
    title: str
    summary: str
    facts: list[Fact]


# --------------------------------------------------------------------------
# L4 — Script (writer agent output)
# --------------------------------------------------------------------------

class Scene(BaseModel):
    scene_id: str
    text: str
    referenced_fact_ids: list[str] = Field(default_factory=list)
    visual_keywords: list[str] = Field(default_factory=list)


class Script(BaseModel):
    script_id: str = Field(default_factory=lambda: _uid("scr"))
    job_id: str
    language: str
    scenes: list[Scene]

    def full_text(self) -> str:
        return " ".join(s.text for s in self.scenes)


# --------------------------------------------------------------------------
# L4 — Verification (verifier agent output)
# --------------------------------------------------------------------------

class Verdict(str, Enum):
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    UNVERIFIABLE = "UNVERIFIABLE"
    NEEDS_HUMAN_REVIEW = "NEEDS_HUMAN_REVIEW"


class FactCheck(BaseModel):
    claim_id: str          # scene_id the claim came from
    claim_text: str
    verdict: Verdict
    confidence: float = 0.0
    evidence_span: str = ""       # the source text that supports/contradicts it
    evidence_fact_id: str | None = None
    reason: str = ""              # why it failed — fed back to the writer on repair
    attempt: int = 1


class VerifiedScript(BaseModel):
    script: Script
    checks: list[FactCheck]
    status: Literal["APPROVED", "NEEDS_HUMAN_REVIEW"]

    @property
    def failed(self) -> list[FactCheck]:
        return [c for c in self.checks if c.verdict != Verdict.SUPPORTED]


# --------------------------------------------------------------------------
# L3 — Media assets
# --------------------------------------------------------------------------

class VoiceConfig(BaseModel):
    language: str
    voice: str = "default"
    style: str = "official"
    speed: float = 1.0


class SceneTiming(BaseModel):
    scene_id: str
    start_sec: float
    end_sec: float


class AudioAsset(BaseModel):
    path: str
    duration_sec: float
    timings: list[SceneTiming]
    provider: str


class ImageAsset(BaseModel):
    scene_id: str
    path: str
    provider: str       # which provider actually produced it (fallback visibility)
    is_fallback: bool = False


# --------------------------------------------------------------------------
# L5 — Job state machine
# --------------------------------------------------------------------------

class Stage(str, Enum):
    QUEUED = "queued"
    EXTRACTING = "extracting"
    SCRIPTING = "scripting"
    VERIFYING = "verifying"
    GENERATING_MEDIA = "generating_media"
    ASSEMBLING = "assembling"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


# Legal transitions — the state machine refuses anything not listed here.
TRANSITIONS: dict[Stage, set[Stage]] = {
    Stage.QUEUED: {Stage.EXTRACTING, Stage.FAILED},
    Stage.EXTRACTING: {Stage.SCRIPTING, Stage.FAILED},
    Stage.SCRIPTING: {Stage.VERIFYING, Stage.FAILED},
    Stage.VERIFYING: {Stage.SCRIPTING, Stage.GENERATING_MEDIA, Stage.FAILED},  # loops back on repair
    Stage.GENERATING_MEDIA: {Stage.ASSEMBLING, Stage.FAILED},
    Stage.ASSEMBLING: {Stage.PENDING_REVIEW, Stage.FAILED},
    Stage.PENDING_REVIEW: {Stage.APPROVED, Stage.REJECTED, Stage.SCRIPTING},   # reject -> regenerate
    Stage.APPROVED: set(),
    Stage.REJECTED: set(),
    Stage.FAILED: set(),
}


class VideoResult(BaseModel):
    language: str
    video_path: str
    captions_path: str
    duration_sec: float


class Job(BaseModel):
    job_id: str = Field(default_factory=lambda: _uid("job"))
    doc_id: str
    languages: list[str]
    stage: Stage = Stage.QUEUED
    progress: dict[str, str] = Field(default_factory=dict)  # per-language sub-stage
    created_at: datetime = Field(default_factory=_now)
    error: str | None = None
    videos: list[VideoResult] = Field(default_factory=list)
    review_notes: str = ""


class JobStatus(BaseModel):
    """L5 -> L6 WebSocket payload."""
    job_id: str
    stage: Stage
    languages: list[str]
    progress: dict[str, str]
    error: str | None = None
