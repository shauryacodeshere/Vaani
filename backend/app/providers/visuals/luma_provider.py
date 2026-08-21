"""
L3 — Luma Dream Machine Video Visual Provider.
Generates realistic AI model video clips for scenes using Luma Dream Machine API.
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path
import httpx

from app.config import settings
from app.providers.base import VisualProvider
from app.schemas import ImageAsset, Scene

logger = logging.getLogger("vaanireach.providers.luma")


class LumaVideoVisualProvider(VisualProvider):
    name: str = "luma"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.LUMA_API_KEY
        self.base_url = "https://api.lumalabs.ai/dream-machine/v1"

    async def get_image(self, scene: Scene, out_path: str) -> ImageAsset:
        """
        Generate an AI video clip for the scene using Luma Dream Machine.
        Saves the generated MP4/video asset to out_path.
        """
        if not self.api_key:
            raise RuntimeError("Luma API key is not configured.")

        # Construct prompt targeting AI Indian presenter explaining the notice
        keywords_str = ", ".join(scene.visual_keywords) if scene.visual_keywords else "Official announcement"
        prompt = (
            f"Photorealistic 16:9 4k video of a professional Indian presenter / anchor in formal business attire "
            f"speaking directly to camera with expressive hand gestures and confident warm expressions, "
            f"explaining an official government circular in a modern news studio: {keywords_str}. "
            f"Context: {scene.text[:120]}"
        )

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "accept": "application/json",
            "Content-Type": "application/json",
        }

        payload = {
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "loop": False,
        }

        # Change extension to .mp4 if requested as video
        out_file = Path(out_path)
        if out_file.suffix.lower() not in [".mp4", ".mov", ".webm"]:
            out_file = out_file.with_suffix(".mp4")
        out_file.parent.mkdir(parents=True, exist_ok=True)

        async with httpx.AsyncClient(timeout=10.0) as client:
            # 1. Trigger generation
            logger.info(f"Submitting Luma generation for scene {scene.scene_id}: '{prompt[:60]}...'")
            try:
                resp = await client.post(f"{self.base_url}/generations", json=payload, headers=headers)
            except Exception as e:
                raise RuntimeError(f"Luma API connection failed: {e}")
            
            if resp.status_code not in (200, 201):
                logger.warning(f"Luma generation trigger failed [{resp.status_code}]: {resp.text[:200]}")
                raise RuntimeError(f"Luma API error ({resp.status_code}): {resp.text[:200]}")

            gen_data = resp.json()
            gen_id = gen_data.get("id")
            if not gen_id:
                raise RuntimeError("Luma API did not return a generation ID.")

            # 2. Poll for completion (up to 45 seconds)
            max_attempts = 15
            for attempt in range(max_attempts):
                await asyncio.sleep(3.0)
                status_resp = await client.get(f"{self.base_url}/generations/{gen_id}", headers=headers)
                if status_resp.status_code != 200:
                    continue

                status_data = status_resp.json()
                state = status_data.get("state")

                if state == "completed":
                    video_url = status_data.get("assets", {}).get("video")
                    if not video_url:
                        raise RuntimeError("Luma generation completed but no video asset URL found.")

                    # 3. Download the video clip
                    dl_resp = await client.get(video_url, timeout=60.0)
                    if dl_resp.status_code == 200:
                        out_file.write_bytes(dl_resp.content)
                        logger.info(f"Luma video clip saved successfully for scene {scene.scene_id} ({len(dl_resp.content)} bytes)")
                        return ImageAsset(
                            scene_id=scene.scene_id,
                            path=str(out_file),
                            provider="luma",
                            is_fallback=False,
                        )
                elif state == "failed":
                    failure_reason = status_data.get("failure_reason", "Unknown failure")
                    raise RuntimeError(f"Luma video generation failed: {failure_reason}")

            raise TimeoutError("Luma video generation timed out.")
