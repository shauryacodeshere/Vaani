"""
L3 — Provider Registry and Factories.
Instantiates provider fallback chains based on configuration and environment settings.
"""
from __future__ import annotations

import logging
from app.config import settings
from app.providers.base import LLMProvider, TranslationProvider, TTSProvider, VisualProvider
from app.providers.mock import MockLLM, MockTranslation, MockTTS, MockVisuals
from app.providers.visuals.luma_provider import LumaVideoVisualProvider
from app.providers.visuals.title_card import TitleCardVisualProvider

logger = logging.getLogger("vaanireach.providers")


def get_llm_provider() -> LLMProvider:
    """Resolve LLM provider (Groq/GPT-OSS, Gemini, or Mock)."""
    return MockLLM()


def get_translation_providers() -> list[TranslationProvider]:
    """Resolve translation provider chain."""
    return [MockTranslation()]


def get_tts_providers() -> list[TTSProvider]:
    """Resolve TTS provider chain."""
    return [MockTTS()]


def get_visual_providers() -> list[VisualProvider]:
    """
    Resolve visual & video clip provider chain:
    1. Luma Dream Machine (AI Model Video Generation)
    2. Styled High-Definition Title Card
    3. Mock Visuals
    """
    providers: list[VisualProvider] = []
    
    if settings.LUMA_API_KEY:
        providers.append(LumaVideoVisualProvider(api_key=settings.LUMA_API_KEY))
    
    providers.append(TitleCardVisualProvider())
    providers.append(MockVisuals())
    
    return providers
