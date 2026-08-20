"""L4 — Extraction Agent: source document -> structured, source-cited facts."""
from __future__ import annotations

import json

from app.providers.base import LLMProvider
from app.schemas import ExtractionResult, Fact, SourceDocument

SYSTEM = """You extract atomic, verifiable facts from official notices.
Rules:
- Every fact MUST include source_span: the verbatim sentence it came from.
- Do not infer, summarise, or combine facts. Extract only what is stated.
- Tag dates, numbers, names and locations precisely — these are verified strictly."""


async def run(doc: SourceDocument, llm: LLMProvider) -> ExtractionResult:
    payload = json.dumps({"task": "extract", "title": doc.title, "text": doc.raw_text})
    raw = await llm.complete_json(SYSTEM, payload, schema_hint="ExtractionResult")

    facts = [Fact(**f) for f in raw["facts"]]
    # Guard: a fact whose source_span is not in the document is a hallucination.
    facts = [f for f in facts if f.source_span.strip() and f.source_span[:40] in doc.raw_text]

    return ExtractionResult(
        doc_id=doc.doc_id,
        title=raw.get("title", doc.title),
        summary=raw.get("summary", ""),
        facts=facts,
    )
