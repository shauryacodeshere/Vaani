"""
L2 — Captions.

Built from TTS scene timings, not from re-transcribing the audio. The TTS
provider already knows exactly when each scene starts and ends, so captions
are exact by construction rather than approximated after the fact.
"""
from __future__ import annotations

from pathlib import Path

from app.schemas import AudioAsset, Script


def _ts(seconds: float, sep: str = ",") -> str:
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    ms = int(round((s - int(s)) * 1000))
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{ms:03d}"


def build_srt(script: Script, audio: AudioAsset, out_path: str) -> str:
    text_by_scene = {s.scene_id: s.text for s in script.scenes}
    lines: list[str] = []
    for i, t in enumerate(audio.timings, 1):
        lines += [
            str(i),
            f"{_ts(t.start_sec)} --> {_ts(t.end_sec)}",
            text_by_scene.get(t.scene_id, ""),
            "",
        ]
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text("\n".join(lines), encoding="utf-8")
    return out_path


def build_vtt(script: Script, audio: AudioAsset, out_path: str) -> str:
    text_by_scene = {s.scene_id: s.text for s in script.scenes}
    lines = ["WEBVTT", ""]
    for t in audio.timings:
        lines += [
            f"{_ts(t.start_sec, '.')} --> {_ts(t.end_sec, '.')}",
            text_by_scene.get(t.scene_id, ""),
            "",
        ]
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text("\n".join(lines), encoding="utf-8")
    return out_path
