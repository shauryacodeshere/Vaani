"""
L5 — Shared retry + provider-fallback wrapper.

Used by EVERY external API call (translation, TTS, visuals, LLM).
Behaviour: retry a provider with backoff -> on exhaustion, fall through to the
next provider in the chain -> if all fail, either raise or return a degraded
result, depending on whether the stage is critical.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable, Sequence, TypeVar

log = logging.getLogger("vaanireach.fallback")

T = TypeVar("T")


class AllProvidersFailed(Exception):
    pass


async def with_fallback(
    providers: Sequence[Any],
    call: Callable[[Any], Awaitable[T]],
    *,
    retries: int = 2,
    base_delay: float = 0.4,
    degraded: Callable[[], T] | None = None,
    label: str = "call",
) -> T:
    """
    Try each provider in order, retrying each `retries` times with backoff.

    If every provider fails:
      - return `degraded()` if supplied (non-critical stage, e.g. visuals)
      - otherwise raise AllProvidersFailed (critical stage, e.g. TTS)
    """
    last_err: Exception | None = None

    for provider in providers:
        name = getattr(provider, "name", provider.__class__.__name__)
        for attempt in range(1, retries + 1):
            try:
                result = await call(provider)
                if attempt > 1 or provider is not providers[0]:
                    log.warning("%s succeeded via %s (attempt %d)", label, name, attempt)
                return result
            except Exception as e:  # noqa: BLE001 - deliberate: any provider error triggers fallback
                last_err = e
                log.warning("%s failed on %s (attempt %d/%d): %s",
                            label, name, attempt, retries, e)
                if attempt < retries:
                    await asyncio.sleep(base_delay * (2 ** (attempt - 1)))

    if degraded is not None:
        log.error("%s: all providers failed, degrading gracefully", label)
        return degraded()

    raise AllProvidersFailed(f"{label}: all providers failed. Last error: {last_err}")
