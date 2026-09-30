"""
L5 — Orchestration.

Owns the job state machine and drives every stage. Each stage writes its
output to the store before advancing, so any stage is independently
inspectable, retryable, and demoable — that is what makes this a pipeline
rather than one long prompt chain.
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Callable

from app.agents import graph
from app.assembly import captions as caption_builder
from app.assembly import ffmpeg_pipeline
from app.orchestration.retry_fallback import with_fallback
from app.providers.base import (
    LLMProvider,
    TranslationProvider,
    TTSProvider,
    VisualProvider,
)
from app.schemas import (
    TRANSITIONS,
    Job,
    JobStatus,
    Scene,
    SourceDocument,
    Stage,
    VerifiedScript,
    VideoResult,
    VoiceConfig,
)

log = logging.getLogger("vaanireach.jobs")


class IllegalTransition(Exception):
    pass


class JobStore:
    """In-memory store. Swap for the Supabase tables — same method surface."""

    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self.artifacts: dict[str, dict] = {}   # job_id -> stage outputs

    def save(self, job: Job) -> None:
        self.jobs[job.job_id] = job

    def get(self, job_id: str) -> Job | None:
        return self.jobs.get(job_id)

    def list(self) -> list[Job]:
        return list(self.jobs.values())

    def put_artifact(self, job_id: str, key: str, value) -> None:
        self.artifacts.setdefault(job_id, {})[key] = value

    def get_artifact(self, job_id: str, key: str):
        return self.artifacts.get(job_id, {}).get(key)


class Pipeline:
    def __init__(
        self,
        store: JobStore,
        llm: LLMProvider,
        translation: list[TranslationProvider],
        tts: list[TTSProvider],
        visuals: list[VisualProvider],
        output_root: str = "output",
        on_status: Callable[[JobStatus], None] | None = None,
    ) -> None:
        self.store = store
        self.llm = llm
        self.translation = translation
        self.tts = tts
        self.visuals = visuals
        self.output_root = Path(output_root)
        self.on_status = on_status

    # ---------------- state machine ----------------

    def _advance(self, job: Job, target: Stage, **progress) -> None:
        if target not in TRANSITIONS[job.stage]:
            raise IllegalTransition(f"{job.stage.value} -> {target.value}")
        job.stage = target
        job.progress.update(progress)
        self.store.save(job)
        log.info("[%s] stage -> %s", job.job_id, target.value)
        if self.on_status:
            self.on_status(JobStatus(job_id=job.job_id, stage=job.stage,
                                     languages=job.languages,
                                     progress=job.progress, error=job.error))

    def _set_lang(self, job: Job, lang: str, sub_stage: str) -> None:
        job.progress[lang] = sub_stage
        self.store.save(job)
        if self.on_status:
            self.on_status(JobStatus(job_id=job.job_id, stage=job.stage,
                                     languages=job.languages,
                                     progress=job.progress, error=job.error))

    # ---------------- pipeline ----------------

    async def run(self, doc: SourceDocument, languages: list[str], job: Job | None = None) -> Job:
        if job is None:
            job = Job(doc_id=doc.doc_id, languages=languages,
                      progress={lang: "queued" for lang in languages})
        self.store.save(job)

        try:
            # L4 — extraction
            self._advance(job, Stage.EXTRACTING)
            extraction = await graph.extract(doc, self.llm)
            self.store.put_artifact(job.job_id, "extraction", extraction)

            # L4 — script + verification (per language)
            self._advance(job, Stage.SCRIPTING)
            verified: dict[str, VerifiedScript] = {}
            for lang in languages:
                self._set_lang(job, lang, "scripting")
                job.stage = Stage.VERIFYING
                self._set_lang(job, lang, "verifying")

                def _progress(l, attempt, n_failed):
                    self._set_lang(job, l, f"verifying (attempt {attempt}, {n_failed} failed)")

                vs = await graph.write_and_verify(
                    job.job_id, extraction, lang, self.llm, on_attempt=_progress
                )

                # Translate the verified script (verification happens on the
                # grounded source language first, then we translate — never the
                # other way round, or errors get laundered through translation).
                translated_scenes: list[Scene] = []
                for scene in vs.script.scenes:
                    text = await with_fallback(
                        self.translation,
                        lambda p, t=scene.text, l=lang: p.translate(t, l),
                        degraded=lambda t=scene.text: t,   # untranslated beats no video
                        label=f"translate[{lang}]",
                    )
                    translated_scenes.append(scene.model_copy(update={"text": text}))
                vs = vs.model_copy(update={
                    "script": vs.script.model_copy(update={"scenes": translated_scenes})
                })

                verified[lang] = vs
                self._set_lang(job, lang, f"verified:{vs.status}")

            self.store.put_artifact(job.job_id, "verified", verified)

            # L3 — media generation (Sequential per language to prevent Render 512MB RAM OOM)
            job.stage = Stage.VERIFYING
            self._advance(job, Stage.GENERATING_MEDIA)
            media = {}

            for lang, vs in verified.items():
                self._set_lang(job, lang, "generating_media")
                base = self.output_root / job.job_id / lang
                base.mkdir(parents=True, exist_ok=True)

                # TTS synthesis
                audio = await with_fallback(
                    self.tts,
                    lambda p, s=vs.script.scenes, l=lang, b=base:
                        p.synthesize(s, VoiceConfig(language=l), str(b / "narration.wav")),
                    label=f"tts[{lang}]",
                )

                # Visual scene graphics (sequential per scene)
                images = []
                for sc in vs.script.scenes:
                    img = await with_fallback(
                        self.visuals,
                        lambda p, s=sc, b=base:
                            p.get_image(s, str(b / f"{s.scene_id}.png")),
                        label=f"visual[{lang}/{sc.scene_id}]",
                        degraded=None,
                    )
                    images.append(img)

                media[lang] = (audio, images)


            # L2 — captions + assembly + tailored lip-sync video
            self._advance(job, Stage.ASSEMBLING)
            
            # Global semaphore to ensure only one video renders at a time to prevent Render 512MB RAM OOM
            render_semaphore = asyncio.Semaphore(1)

            async def assemble_single_lang(lang: str, vs: VerifiedScript):
                self._set_lang(job, lang, "assembling")
                audio, images = media[lang]
                base = self.output_root / job.job_id / lang
                base.mkdir(parents=True, exist_ok=True)

                srt = await asyncio.to_thread(
                    caption_builder.build_srt, vs.script, audio, str(base / "captions.srt")
                )
                await asyncio.to_thread(
                    caption_builder.build_vtt, vs.script, audio, str(base / "captions.vtt")
                )

                default_video_path = str(base / f"vaanireach_{lang}.mp4")
                video_rendered = False

                async with render_semaphore:
                    try:
                        from app.assembly.lip_sync import synthesize_speech, render_lip_sync_video
                        import shutil
                        import gc

                        full_script_text = " ".join([sc.text for sc in vs.script.scenes])
                        doc_bullets = [f.claim for f in extraction.facts[:3]] if (extraction and extraction.facts) else None
                        
                        # 1. Synthesize and render primary female presenter video
                        f_audio = str(base / f"speech_female_{lang}.wav")
                        await synthesize_speech(full_script_text, lang, f_audio, persona="female")
                        
                        f_video = str(base / f"vaanireach_female_{lang}.mp4")
                        await asyncio.to_thread(
                            render_lip_sync_video,
                            audio_path=f_audio,
                            output_video_path=f_video,
                            workdir=str(base / "lip_work_female"),
                            lang=lang,
                            persona="female",
                            doc_title=doc.title,
                            doc_category=getattr(doc, "category", "Official Public Notice"),
                            doc_department=doc.origin_ref or "Government of India",
                            doc_bullets=doc_bullets,
                        )

                        shutil.copy(f_video, default_video_path)

                        try:
                            public_dir = Path("../frontend/public/videos") / job.job_id
                            public_dir.mkdir(parents=True, exist_ok=True)
                            shutil.copy(f_video, str(public_dir / f"vaanireach_female_{lang}.mp4"))
                            shutil.copy(default_video_path, str(public_dir / f"vaanireach_{lang}.mp4"))
                        except Exception:
                            pass

                        video_rendered = True
                        gc.collect()

                    except Exception as ex:
                        log.warning("[%s] Tailored presenter video generation fallback: %s", job.job_id, ex)

                    if not video_rendered:
                        await asyncio.to_thread(
                            ffmpeg_pipeline.assemble,
                            language=lang,
                            images=images,
                            audio=audio,
                            captions_path=srt,
                            workdir=str(base / "work"),
                            out_path=default_video_path,
                        )
                        import gc
                        gc.collect()

                result = VideoResult(
                    language=lang,
                    video_path=default_video_path,
                    captions_path=srt,
                    duration_sec=audio.duration_sec,
                )
                job.videos.append(result)
                self._set_lang(job, lang, "ready_for_review")

            # Run languages sequentially or through semaphore
            for lang, vs in verified.items():
                await assemble_single_lang(lang, vs)

            # L6 — human gate. Nothing is published without this.
            self._advance(job, Stage.PENDING_REVIEW)
            return job

        except Exception as e:  # noqa: BLE001
            job.error = f"{type(e).__name__}: {e}"
            job.stage = Stage.FAILED
            self.store.save(job)
            log.exception("[%s] pipeline failed", job.job_id)
            raise

    # ---------------- human review ----------------

    def approve(self, job_id: str, notes: str = "") -> Job:
        job = self.store.get(job_id)
        job.review_notes = notes
        self._advance(job, Stage.APPROVED)
        return job

    def reject(self, job_id: str, notes: str = "") -> Job:
        job = self.store.get(job_id)
        job.review_notes = notes
        self._advance(job, Stage.REJECTED)
        return job
