"""
VaaniReach Application Configuration.
Loads all provider keys, database URLs, and pipeline settings from environment variables.
"""
from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or workspace root
env_path = Path(__file__).resolve().parents[1] / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    # ---- Luma AI Dream Machine ----
    LUMA_API_KEY: str = os.getenv("LUMA_API_KEY", "luma-api-Wd6J57bG0tnvcOFhID14BkOTppLICP5XnrVfL1KEt_g")

    # ---- LLM Provider ----
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")
    GPT_OSS_API_KEY: str = os.getenv("GPT_OSS_API_KEY", "")
    GPT_OSS_BASE_URL: str = os.getenv("GPT_OSS_BASE_URL", "https://api.groq.com/openai/v1")
    GPT_OSS_MODEL: str = os.getenv("GPT_OSS_MODEL", "openai/gpt-oss-120b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # ---- Translation & TTS Providers ----
    TRANSLATION_PROVIDERS: str = os.getenv("TRANSLATION_PROVIDERS", "mock")
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    TTS_PROVIDERS: str = os.getenv("TTS_PROVIDERS", "mock")

    # ---- Visual Providers (Luma AI -> Gemini -> Stock -> Title Card -> Mock) ----
    VISUAL_PROVIDERS: str = os.getenv("VISUAL_PROVIDERS", "luma,title_card,mock")
    PEXELS_API_KEY: str = os.getenv("PEXELS_API_KEY", "")

    # ---- Database & Storage ----
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # ---- Pipeline Settings ----
    OUTPUT_ROOT: str = os.getenv("OUTPUT_ROOT", "output")
    DEFAULT_LANGUAGES: list[str] = os.getenv("DEFAULT_LANGUAGES", "hi,mr,ta").split(",")
    MAX_REPAIR_ATTEMPTS: int = int(os.getenv("MAX_REPAIR_ATTEMPTS", "3"))


settings = Settings()
