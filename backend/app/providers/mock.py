"""
Mock providers — let the whole pipeline run end-to-end with zero API keys.

These exist so every layer can be integrated and debugged before real
providers are wired in (PRD: T+2h stub-integration checkpoint), and so the
demo still works if the venue wifi dies.

Each real provider (sarvam.py, elevenlabs.py, nano_banana.py, ...) implements
the same interface and drops into the registry beside these.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import subprocess
import wave
from pathlib import Path

from app.providers.base import (
    LLMProvider,
    TranslationProvider,
    TTSProvider,
    VisualProvider,
)
from app.schemas import AudioAsset, ImageAsset, Scene, SceneTiming, VoiceConfig

# Deterministic pseudo-translation markers so multilingual flow is visible in logs.
_LANG_TAG = {"hi": "हि", "mr": "मर", "ta": "த", "bn": "বা", "te": "తె", "en": "en"}


class MockLLM(LLMProvider):
    """
    Deterministic stand-in for gpt-oss-120b.

    Extraction: sentence-splits the source and tags each sentence as a fact.
    Scripting:  regroups facts into scenes.
    Verification is NOT done here — the verifier agent does real string/evidence
    checking, so the repair loop is genuinely exercised even with a mock LLM.
    """
    name = "mock-llm"

    async def complete_json(self, system: str, user: str, schema_hint: str) -> dict:
        await asyncio.sleep(0.01)
        payload = json.loads(user)
        task = payload["task"]

        if task == "extract":
            text = payload["text"]
            sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
            facts = []
            for i, s in enumerate(sentences, 1):
                ftype = "other"
                low = s.lower()
                if any(ch.isdigit() for ch in s):
                    ftype = "number"
                if any(m in low for m in ("january", "february", "march", "april", "may",
                                          "june", "july", "august", "september",
                                          "october", "november", "december", "deadline")):
                    ftype = "date"
                facts.append({
                    "id": f"f{i}",
                    "claim": s,
                    "type": ftype,
                    "source_span": s,
                })
            return {
                "title": payload.get("title", "Untitled Notice"),
                "summary": sentences[0] if sentences else "",
                "facts": facts,
            }

        if task == "script":
            facts = payload["facts"]
            scenes = []
            for i, f in enumerate(facts, 1):
                scenes.append({
                    "scene_id": f"s{i}",
                    # Mock writer restates the fact verbatim -> verification passes.
                    "text": f["claim"] + ".",
                    "referenced_fact_ids": [f["id"]],
                    "visual_keywords": f["claim"].split()[:3],
                })
            return {"scenes": scenes}

        if task == "repair":
            # Repair = fall back to the grounded source span verbatim.
            return {"text": payload["evidence_span"] + "."}

        raise ValueError(f"MockLLM: unknown task {task!r}")


class MockTranslation(TranslationProvider):
    name = "mock-translate"

    async def translate(self, text: str, target_lang: str) -> str:
        await asyncio.sleep(0.01)
        if target_lang == "en":
            return text
        # Tag-prefix keeps the original facts intact so verification still works
        # against the source. Real providers replace this wholesale.
        return f"[{_LANG_TAG.get(target_lang, target_lang)}] {text}"


class MockTTS(TTSProvider):
    """Generates real silent WAV audio with real per-scene timings, so the
    caption generator and ffmpeg assembly downstream are exercised for real."""
    name = "mock-tts"
    WORDS_PER_SEC = 2.6

    async def synthesize(self, scenes, voice: VoiceConfig, out_path: str) -> AudioAsset:
        await asyncio.sleep(0.01)
        timings, cursor = [], 0.0
        for sc in scenes:
            dur = max(1.6, len(sc.text.split()) / self.WORDS_PER_SEC)
            timings.append(SceneTiming(scene_id=sc.scene_id,
                                       start_sec=round(cursor, 2),
                                       end_sec=round(cursor + dur, 2)))
            cursor += dur

        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        framerate = 16000
        with wave.open(out_path, "w") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(framerate)
            w.writeframes(b"\x00\x00" * int(framerate * cursor))

        return AudioAsset(path=out_path, duration_sec=round(cursor, 2),
                          timings=timings, provider=self.name)


class MockVisuals(VisualProvider):
    """Renders a real solid-colour title card via ffmpeg — this is also the
    genuine production fallback when image providers return nothing usable."""
    name = "mock-visuals"

    async def get_image(self, scene: Scene, out_path: str) -> ImageAsset:
        await asyncio.sleep(0.01)
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        seed = hashlib.md5(scene.scene_id.encode()).hexdigest()
        colour = f"0x{seed[:6]}"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error",
             "-f", "lavfi", "-i", f"color=c={colour}:s=1280x720", "-frames:v", "1", out_path],
            check=True,
        )
        return ImageAsset(scene_id=scene.scene_id, path=out_path,
                          provider=self.name, is_fallback=True)


class AlwaysFailingProvider(TranslationProvider):
    """Used in tests/demo to prove the fallback chain actually works."""
    name = "always-failing"

    async def translate(self, text: str, target_lang: str) -> str:
        raise ConnectionError("simulated provider outage")
