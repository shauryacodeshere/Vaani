"""
L3 — Sarvam AI Text-to-Speech (TTS) Provider.
High-fidelity neural Indic speech synthesis using Sarvam Bulbul-v2.
"""
from __future__ import annotations

import base64
import logging
from pathlib import Path
import wave
import httpx

from app.providers.base import TTSProvider
from app.schemas import AudioAsset, Scene, SceneTiming, VoiceConfig

logger = logging.getLogger("vaanireach.providers.tts.sarvam")

SARVAM_TTS_LANG_MAP: dict[str, str] = {
    "hi": "hi-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
    "bn": "bn-IN",
    "te": "te-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
    "od": "od-IN",
    "en": "en-IN",
}


def _get_wav_duration_and_frames(wav_bytes: bytes) -> tuple[float, bytes, int, int, int]:
    """Inspect raw WAV bytes and return duration, raw audio frames, and audio params."""
    import io
    with io.BytesIO(wav_bytes) as bio:
        with wave.open(bio, "rb") as wf:
            nchannels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            nframes = wf.getnframes()
            duration = nframes / float(framerate)
            frames = wf.readframes(nframes)
            return duration, frames, nchannels, sampwidth, framerate


class SarvamTTSProvider(TTSProvider):
    name = "sarvam-tts"

    def __init__(self, api_key: str, endpoint: str = "https://api.sarvam.ai/text-to-speech") -> None:
        self.api_key = api_key
        self.endpoint = endpoint

    async def synthesize(
        self, scenes: list[Scene], voice: VoiceConfig, out_path: str
    ) -> AudioAsset:
        """Synthesize natural Indic speech for each scene and concatenate with exact timings."""
        target_lang = voice.language.lower()
        sarvam_lang = SARVAM_TTS_LANG_MAP.get(target_lang, f"{target_lang}-IN")

        # bulbul:v2 compatible speakers: anushka (female), abhilash (male)
        voice_type = (voice.voice or "female").lower()
        speaker = "abhilash" if any(k in voice_type for k in ["male", "man", "boy", "rajesh"]) else "anushka"

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

        scene_audios: list[tuple[Scene, float, bytes, int, int, int]] = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for scene in scenes:
                clean_text = scene.text.strip()
                if not clean_text:
                    continue

                payload = {
                    "inputs": [clean_text],
                    "target_language_code": sarvam_lang,
                    "speaker": speaker,
                    "model": "bulbul:v2",
                }

                resp = await client.post(self.endpoint, json=payload, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"Sarvam TTS failed HTTP {resp.status_code}: {resp.text}")
                    raise RuntimeError(f"Sarvam TTS synthesis failed: {resp.text}")

                data = resp.json()
                audios = data.get("audios", [])
                if not audios:
                    raise RuntimeError("Sarvam TTS returned empty audio payload")

                raw_wav = base64.b64decode(audios[0])
                dur, frames, nchannels, sampwidth, framerate = _get_wav_duration_and_frames(raw_wav)
                scene_audios.append((scene, dur, frames, nchannels, sampwidth, framerate))

        if not scene_audios:
            raise RuntimeError("No audio chunks synthesized by Sarvam")

        # Concatenate audio chunks and calculate exact per-scene timings
        out_p = Path(out_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        timings: list[SceneTiming] = []
        current_time = 0.0

        first_audio = scene_audios[0]
        nchannels, sampwidth, framerate = first_audio[3], first_audio[4], first_audio[5]

        with wave.open(str(out_p), "wb") as out_wf:
            out_wf.setnchannels(nchannels)
            out_wf.setsampwidth(sampwidth)
            out_wf.setframerate(framerate)

            for scene, dur, frames, _, _, _ in scene_audios:
                out_wf.writeframes(frames)
                timings.append(
                    SceneTiming(
                        scene_id=scene.scene_id,
                        start_sec=round(current_time, 2),
                        end_sec=round(current_time + dur, 2),
                    )
                )
                current_time += dur

        total_duration = round(current_time, 2)
        logger.info(f"Synthesized Sarvam audio ({len(scenes)} scenes, {total_duration}s) to: {out_p}")

        return AudioAsset(
            path=str(out_p),
            duration_sec=total_duration,
            timings=timings,
            provider=self.name,
        )
