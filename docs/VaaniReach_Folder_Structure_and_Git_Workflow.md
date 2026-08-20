# VaaniReach — Folder Structure & Git Workflow

Companion to the PRD. Maps directly onto the six layers (L1–L6) and the four member ownership areas (A–D) so each person can work in their own subtree with minimal file overlap, and merges stay small and reviewable.

---

## 1. Repository Layout

Single monorepo (`vaanireach/`) — one repo is easier to coordinate across 4 people in 24 hours than separate frontend/backend repos, and the shared JSON contracts (PRD Section 6) live in one place both sides can reference.

```
vaanireach/
├── backend/                          # Python + FastAPI — L1, L2, L3, L4, L5
│   ├── app/
│   │   ├── main.py                   # FastAPI app entrypoint
│   │   ├── config.py                 # env/config loading
│   │   │
│   │   ├── db/                       # L1 — Member A
│   │   │   ├── models.py             # SQLAlchemy/Pydantic models
│   │   │   ├── schema.sql            # jobs, documents, facts, fact_embeddings,
│   │   │   │                         # scripts, script_claims, fact_checks,
│   │   │   │                         # media_assets, videos, reviews
│   │   │   └── migrations/
│   │   │
│   │   ├── ingestion/                # L1 — Member A
│   │   │   ├── parsers.py            # pdfplumber/PyMuPDF, python-docx
│   │   │   ├── url_fetch.py
│   │   │   └── routes.py
│   │   │
│   │   ├── orchestration/            # L5 — Member A
│   │   │   ├── job_manager.py        # state machine
│   │   │   ├── worker.py             # Redis + lightweight worker
│   │   │   ├── retry_fallback.py     # shared retry/fallback wrapper (used by C too)
│   │   │   └── ws.py                 # WebSocket job-status feed
│   │   │
│   │   ├── agents/                   # L4 — Member B
│   │   │   ├── graph.py              # LangGraph workflow definition
│   │   │   ├── extraction_agent.py
│   │   │   ├── writer_agent.py
│   │   │   ├── verifier_agent.py
│   │   │   └── prompts/
│   │   │
│   │   ├── providers/                # L3 — Member C
│   │   │   ├── translation/
│   │   │   │   ├── base.py           # TranslationProvider interface
│   │   │   │   ├── sarvam.py
│   │   │   │   ├── indictrans2.py
│   │   │   │   └── google_translate.py
│   │   │   ├── tts/
│   │   │   │   ├── base.py           # TTSProvider interface
│   │   │   │   ├── sarvam_tts.py
│   │   │   │   ├── elevenlabs.py
│   │   │   │   └── gemini_tts.py
│   │   │   ├── visuals/
│   │   │   │   ├── base.py           # VisualProvider interface
│   │   │   │   ├── nano_banana.py
│   │   │   │   ├── stock_search.py
│   │   │   │   └── title_card.py
│   │   │   └── llm/
│   │   │       ├── base.py           # LLM provider interface
│   │   │       └── gpt_oss.py
│   │   │
│   │   ├── assembly/                 # L2 — Member D
│   │   │   ├── captions.py           # SRT/VTT from TTS timestamps
│   │   │   └── ffmpeg_pipeline.py    # deterministic rendering
│   │   │
│   │   ├── mcp/                      # thin wrapper — Member A
│   │   │   └── server.py             # generate_outreach_video tool
│   │   │
│   │   └── api/
│   │       └── routes.py             # REST route aggregation
│   │
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                         # Next.js + Tailwind + shadcn/ui — L6, Member D
│   ├── app/
│   │   ├── jobs/                     # create job, upload/URL, language select
│   │   ├── status/                   # live pipeline status view
│   │   ├── review/                   # script review, fact highlighting,
│   │   │                             # video preview, approve/reject
│   │   └── history/                  # job history / analytics
│   ├── components/
│   ├── lib/
│   │   └── ws-client.ts              # WebSocket client matching L5's feed
│   ├── package.json
│   └── .env.example
│
├── shared/                           # contracts everyone codes against (PRD §6)
│   └── schemas/
│       ├── fact.schema.json
│       ├── script.schema.json
│       ├── fact_check.schema.json
│       └── job_status.schema.json
│
├── docs/
│   ├── VaaniReach_PRD.md
│   └── VaaniReach_Folder_Structure_and_Git_Workflow.md
│
├── scripts/
│   ├── seed_demo_doc.py              # loads a test notice + injected-error variant
│   └── run_local.sh
│
├── docker-compose.yml                # postgres(pgvector)/supabase-local, redis, backend, frontend
└── README.md
```

**Why this shape works for parallel work:** each member's primary files live under one top-level folder (`db/ingestion/orchestration/mcp` for A, `agents` for B, `providers` for C, `assembly` + all of `frontend/` for D). Nobody edits inside someone else's folder under normal circumstances — the only shared surface is `shared/schemas/` and `api/routes.py`, both small and stable once locked on Day 0.

---

## 2. Branching Strategy

```
main                              ← always demo-able, protected, tagged at milestones
  │
  └── develop                     ← integration branch, every feature branch merges here first
        │
        ├── feat/document-ingestion
        ├── feat/db-schema
        ├── feat/job-orchestration
        ├── feat/websocket-live-status
        ├── feat/retry-fallback-wrapper
        │
        ├── feat/extraction-agent
        ├── feat/script-writer-agent
        ├── feat/verifier-agent
        ├── feat/agent-repair-loop
        │
        ├── feat/translation-provider
        ├── feat/tts-provider
        ├── feat/voice-personalization
        ├── feat/visual-selection
        │
        ├── feat/caption-generation
        ├── feat/ffmpeg-assembly
        │
        ├── feat/dashboard-job-submission
        ├── feat/dashboard-live-status
        ├── feat/dashboard-script-review
        ├── feat/fact-level-highlighting
        ├── feat/video-preview-approval
        ├── feat/subtitle-export
        │
        └── feat/mcp-tool
```

**One branch per feature, not per person or per layer.** Each branch is small, scoped, and independently reviewable — a broken feature branch never blocks anyone else's, and `git log`/PR history shows exactly which feature introduced a bug instead of a vague "Member C's stuff." A member typically owns several feature branches sequentially (finish one, open PR, start the next) rather than one giant branch for their whole layer.

### Feature → owner mapping

| Feature branch | Layer | Owner |
|---|---|---|
| `feat/db-schema` | L1 | A |
| `feat/document-ingestion` | L1 | A |
| `feat/job-orchestration` | L5 | A |
| `feat/websocket-live-status` | L5 | A |
| `feat/retry-fallback-wrapper` | L5 | A |
| `feat/mcp-tool` | L1/L5 | A |
| `feat/extraction-agent` | L4 | B |
| `feat/script-writer-agent` | L4 | B |
| `feat/verifier-agent` | L4 | B |
| `feat/agent-repair-loop` | L4 | B |
| `feat/translation-provider` | L3 | C |
| `feat/tts-provider` | L3 | C |
| `feat/voice-personalization` | L3 | C |
| `feat/visual-selection` | L3 | C |
| `feat/caption-generation` | L2 | C or D (whoever's free first) |
| `feat/ffmpeg-assembly` | L2 | D |
| `feat/dashboard-job-submission` | L6 | D |
| `feat/dashboard-live-status` | L6 | D |
| `feat/dashboard-script-review` | L6 | D |
| `feat/fact-level-highlighting` | L6 | D |
| `feat/video-preview-approval` | L6 | D |
| `feat/subtitle-export` | L6 | D |

This list maps directly onto the Compulsory and Bonus Feature Checklists (PRD §7–8) plus the foundational plumbing (schema, orchestration, retry logic) those features need underneath them — so nothing in the PRD is missing a branch, and no branch exists that isn't tied to an actual feature.

### Commit convention
```
[document-ingestion] add PDF/DOCX parsing
[verifier-agent] pgvector top-3 retrieval step
[tts-provider] sarvam integration + timestamp parsing
[video-preview-approval] approve/reject wiring to review API
[FIX] worker retry loop double-firing on timeout
```
Tag commits with the feature-branch name (not the layer or person) — makes `git log --oneline` across the whole repo self-explanatory.

---

## 3. Integration Checkpoints (when branches actually merge)

Merging continuously and only at the very end are both bad ideas for a 24hr hackathon — the first causes constant interruption, the second guarantees a 2am integration disaster. Fixed checkpoints work better:

| Checkpoint | What happens |
|---|---|
| **T+0 (start)** | Everyone agrees on `shared/schemas/*.json` and `api/routes.py` route shapes before writing implementation code. This is the one thing that must be locked before branching off. |
| **T+~2h** | First merge to `develop` — skeleton/stub versions of each layer (even if they just return mock data matching the schema). This proves the schemas actually work end-to-end before real logic exists. |
| **T+~9h (midpoint)** | Second merge to `develop` — real logic replaces stubs, layer by layer. Pair up at this point (A↔B, C↔D) to catch integration issues live rather than over commit messages. Tag `main` if `develop` is stable: `v0.1-integration`. |
| **T+~18h (feature freeze)** | All compulsory + bonus features merged into `develop`. Final merge to `main`. Tag `v0.2-feature-complete`. No new features after this — only bug fixes. |
| **T+~21h** | Final stabilization merge to `main`. Tag `v1.0-demo`. This is the commit you actually present from. |
| **T+~23–24h** | Buffer — only hotfixes directly on `main` if something breaks during rehearsal, nothing else. |

### Conflict-reduction rules
- Rebase your feature branch onto `develop` before opening a PR, not after — resolve conflicts on your own branch, not in a shared PR review.
- Never edit `shared/schemas/*.json` after T+0 without pinging the whole team — every feature branch depends on these staying stable.
- One PR = one feature branch = one feature. Don't bundle unrelated fixes from other files into the same PR, even if convenient — it makes a bad merge harder to isolate and revert.
- Delete a feature branch once it's merged into `develop` — an ever-growing branch list is exactly what makes a 24hr repo hard to navigate by hour 15.
- If `main` breaks close to demo time, revert the merge commit immediately rather than trying to hotfix live — you can always re-merge a fixed version from `develop`.

---

## 4. Quick Setup Reference

```bash
git clone <repo-url> vaanireach && cd vaanireach
git checkout -b develop
git push -u origin develop

# example: Member B starting the extraction agent
git checkout develop
git checkout -b feat/extraction-agent
# ...work, commit...
git push -u origin feat/extraction-agent
# open PR → feat/extraction-agent into develop
# once merged: delete branch, checkout develop, branch off the next feature
git checkout develop && git pull
git checkout -b feat/script-writer-agent
```

`docker-compose.yml` should bring up Postgres(+pgvector)/local Supabase, Redis, backend, and frontend together, so any member can run the full stack locally regardless of which layer they're building — critical for the T+2h and T+9h integration checkpoints to actually work against real running services rather than descriptions of them.
