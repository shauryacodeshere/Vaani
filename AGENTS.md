# VaaniReach — Project Rules

## What we are building

VaaniReach turns a public government/institutional notice into short narrated **outreach videos in 3+
Indian languages**, with captions, per-claim fact verification against the source, and a human approval
gate. Problem statement PS-02, Codeissance hackathon, 4-person team.

The pipeline, end to end:

```
Officer pastes an official website URL
  -> scraper detects the notices listed on that page
  -> officer picks one notice + a category (cosmetic template hint only)
  -> Extraction Agent  : notice  -> facts, each with a verbatim source_span
  -> Script Writer     : facts   -> per-language scenes
  -> Verifier Agent    : pgvector top-3 -> strict regex gate -> LLM entailment
       FAIL & attempt<3 -> back to Writer with ONLY the failed scenes + reason
       FAIL & attempt=3 -> NEEDS_HUMAN_REVIEW
       PASS             -> Translation -> TTS -> SRT/VTT -> FFmpeg -> video
  -> Human approves     -> PUBLISHED
```

The differentiator is the **generate -> verify -> repair -> escalate loop**, not the video. Never
weaken verification to make a demo pass.

## Layers and who owns what

Nobody edits another member's folder. If you need something from another layer, use its interface.

| Layer | Folders | Owner |
|---|---|---|
| L1 Data + ingestion, L5 orchestration | `backend/app/{db,ingestion,orchestration,mcp,api}`, `main.py`, `config.py` | **Vanshita** |
| L4 Agents | `backend/app/agents/` | **Shreyas** |
| L3 Providers, L2 Assembly | `backend/app/providers/`, `backend/app/assembly/` | **Pruthvi** |
| L6 Dashboard | `frontend/` | **Shaurya** |

Shared and frozen: `backend/app/schemas.py`, `shared/schemas/*.json`.

## Folder structure

```
backend/app/
  schemas.py           LOCKED contracts - every layer codes against these
  main.py config.py    FastAPI entrypoint + env loading
  db/                  models.py schema.sql migrations/
  ingestion/           scraper.py parsers.py url_fetch.py routes.py
  orchestration/       job_manager.py worker.py retry_fallback.py ws.py
  agents/              graph.py extraction_agent.py writer_agent.py
                       verifier_agent.py prompts/
  providers/           __init__.py (registry) base.py mock.py
                       llm/ translation/ tts/ visuals/
  assembly/            captions.py ffmpeg_pipeline.py
  mcp/                 server.py
  api/                 routes.py
frontend/              app/{jobs,status,review,history} components/ lib/ws-client.ts
shared/schemas/        fact / script / fact_check / job_status .schema.json
scripts/               run_flow.py seed_demo_doc.py
docs/                  VaaniReach_PRD.md + folder structure doc
```

## Hard rules

1. **`schemas.py` is frozen.** `Fact`, `Scene`, `Script`, `FactCheck`, `VerifiedScript`, `AudioAsset`,
   `ImageAsset`, `Job`, `JobStatus`, `Stage`, `TRANSITIONS`. Changing a shape breaks all four members
   at once. If a change is truly needed, say so out loud first — do not just edit it.
2. **Zero AI calls in `assembly/`.** FFmpeg and caption generation are deterministic, reproducible,
   and free to re-run. That is a deliberate design claim we make to judges.
3. **Nothing imports a concrete provider.** Pipeline code depends only on the ABCs in
   `providers/base.py`. Swapping Sarvam for Gemini is a registry edit in `providers/__init__.py`.
4. **Every external API call goes through `with_fallback()`** from `orchestration/retry_fallback.py`.
   Chain order in the env var is the fallback order. A dead provider degrades the job, never crashes it.
5. **Every `Fact` carries a verbatim `source_span`.** No span, no fact. That span is the evidence the
   reviewer clicks back to.
6. **Translation happens AFTER verification**, never before — we verify against the English source.
7. **Captions are built from TTS timings**, never re-transcribed. So TTS must return per-scene timings.
8. **Job stage changes must respect `TRANSITIONS`** in `schemas.py`. Never set `job.stage` directly.
9. **Mocks stay working.** `python scripts/run_flow.py` must pass with `*_PROVIDERS=mock` at all times —
   it is how the other three members test without your API keys.

## Style

- Python 3.11+, `from __future__ import annotations`, full type hints, Pydantic v2.
- Providers are `async`. Blocking I/O belongs in a thread, not the event loop.
- Prompts live in `agents/prompts/*.txt`, not inline in Python.
- Secrets come from env via `config.py`. Never hardcode a key, never commit `.env`.

## Git workflow

One branch per feature, cut from `develop`:

```bash
git checkout develop && git pull
git checkout -b feat/<feature-name>
```

Commit message format: `[feature-name] what changed` — e.g. `[verifier-agent] pgvector top-3 retrieval`.

### Before pushing — always confirm

**Never run `git push` on your own.** When a feature is done:

1. Run the feature's verify command and show the real output.
2. Show `git status` and `git diff --stat`.
3. Summarise what changed in 2-3 lines.
4. **Ask the owner to confirm.** Only push after an explicit yes.
5. Then commit, push with `-u origin feat/<name>`, and open a PR into `develop`.

Never push to `main`. Never force-push a shared branch. Never commit `.env`, `output/`, or media files.

## Definition of done

A feature branch is done when: the files listed in the task exist and are typed; the verify command
passes; `scripts/run_flow.py` still passes with mock providers; the owner can explain the design
decisions behind it without reading the code; and the PR is open against `develop`.
