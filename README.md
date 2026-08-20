# VaaniReach — Pipeline Skeleton

Runnable end-to-end flow with mock providers. Every stage exists and passes
real typed objects to the next, so integration is proven before any paid API
is wired in.

## Run it

```bash
pip install pydantic          # only hard dep for the skeleton
python scripts/run_flow.py    # full pipeline: notice -> 3 languages -> mp4
python backend/tests/test_repair_loop.py   # proves the agent loop is real
```

Requires `ffmpeg` on PATH. No API keys needed.

## What actually runs

```
SourceDocument
   ↓  extraction_agent      facts + source_span (evidence, mandatory)
   ↓  writer_agent          scenes per language
   ↓  verifier_agent        retrieve top-k → entail → verdict
   │      ↑ repair only failed scenes, max 3 attempts
   │      └ exhausted → NEEDS_HUMAN_REVIEW (never silently published)
   ↓  translation           after verification, not before
   ↓  tts                   audio + per-scene timings
   ↓  visuals               image per scene (title-card fallback)
   ↓  captions              SRT/VTT built from timings, exact by construction
   ↓  ffmpeg_pipeline       deterministic — zero AI calls in this layer
   ↓  PENDING_REVIEW        human gate
   ↓  APPROVED
```

Verified working: valid H.264/AAC 1280x720 mp4 per language, timed SRT/VTT,
fallback chain firing on provider outage, injected factual errors caught and
repaired, unrepairable claims escalated.

## Swapping mocks for real providers

Nothing in the pipeline imports a concrete provider. Implement the interface
in `app/providers/base.py`, add it to the chain, done:

```python
# app/providers/tts/sarvam_tts.py
class SarvamTTS(TTSProvider):
    name = "sarvam-bulbul-v3"
    async def synthesize(self, scenes, voice, out_path) -> AudioAsset:
        ...  # must return per-scene timings — captions + ffmpeg depend on them
```

```python
Pipeline(
    tts=[SarvamTTS(), ElevenLabsTTS(), MockTTS()],   # order = fallback order
    ...
)
```

The chain order *is* the fallback policy. Keep a mock last so the demo
survives a dead network.

## Layer → owner (see PRD §13)

| Path | Layer | Owner |
|---|---|---|
| `app/db`, `app/ingestion`, `app/orchestration`, `app/mcp` | L1, L5 | A |
| `app/agents` | L4 | B |
| `app/providers` | L3 | C |
| `app/assembly`, `frontend/` | L2, L6 | D |
| `app/schemas.py` | contracts | **all — locked at T+0** |

## Notes for whoever picks this up

- `app/schemas.py` is the contract. Changing it breaks every branch at once —
  announce before touching.
- Verification runs on the **source language, before translation**. Reversing
  that order launders errors through the translator and makes them invisible.
- `retrieve_top_k` in `verifier_agent.py` is lexical for now. Swap the body for
  a pgvector cosine query; the signature is already right.
- `graph.py` node boundaries map 1:1 onto LangGraph nodes if/when you port it.
- Strict types (date/number/name/location) require exact token match. That rule
  is what catches "12000 → 21000", which embedding similarity alone waves through.
