"""
L3 — Sarvam AI Translation Provider.
High-accuracy Indic translation supporting 11+ Indian languages using Sarvam Mayura-v1.
"""
from __future__ import annotations

import logging
import httpx
from app.providers.base import TranslationProvider

logger = logging.getLogger("vaanireach.providers.translation.sarvam")

# Mapping from standard 2-letter ISO codes to Sarvam language codes
SARVAM_LANG_MAP: dict[str, str] = {
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


class SarvamTranslationProvider(TranslationProvider):
    name = "sarvam-translate"

    def __init__(self, api_key: str, endpoint: str = "https://api.sarvam.ai/translate") -> None:
        self.api_key = api_key
        self.endpoint = endpoint

    async def translate(self, text: str, target_lang: str) -> str:
        """Translate text to the target Indian language using Sarvam Mayura model."""
        if not text or not text.strip():
            return text

        if target_lang == "en":
            return text

        sarvam_lang = SARVAM_LANG_MAP.get(target_lang.lower(), f"{target_lang}-IN")

        headers = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "input": text.strip(),
            "source_language_code": "en-IN",
            "target_language_code": sarvam_lang,
            "mode": "formal",
            "model": "mayura:v1",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(self.endpoint, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    translated = data.get("translated_text", "").strip()
                    if translated:
                        logger.info(f"Sarvam translated to [{sarvam_lang}]: {translated[:60]}...")
                        return translated
                else:
                    logger.warning(f"Sarvam translation HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Sarvam translation network error: {e}")

        # If Sarvam encounters error, fallback is handled upstream by retry_fallback
        raise RuntimeError(f"Sarvam translation failed for language '{target_lang}'")
