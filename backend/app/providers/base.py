"""
L3 — Provider interfaces.

Nothing in the pipeline imports a concrete provider directly. Swapping
Sarvam -> IndicTrans2, or Nano Banana -> stock search, is a registry change
in providers/__init__.py, never a pipeline change.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas import AudioAsset, ImageAsset, Scene, VoiceConfig


class LLMProvider(ABC):
    name: str = "llm"

    @abstractmethod
    async def complete_json(self, system: str, user: str, schema_hint: str) -> dict:
        """Return parsed JSON. Implementations must enforce structured output."""


class TranslationProvider(ABC):
    name: str = "translation"

    @abstractmethod
    async def translate(self, text: str, target_lang: str) -> str: ...


class TTSProvider(ABC):
    name: str = "tts"

    @abstractmethod
    async def synthesize(
        self, scenes: list[Scene], voice: VoiceConfig, out_path: str
    ) -> AudioAsset:
        """Must return per-scene timings — captions and ffmpeg both depend on them."""


class VisualProvider(ABC):
    name: str = "visuals"

    @abstractmethod
    async def get_image(self, scene: Scene, out_path: str) -> ImageAsset: ...
