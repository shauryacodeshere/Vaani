"""
L2 — Video assembly. Deterministic. No AI calls in this file, ever.

Same inputs always produce the same video:
    video_clips/images + audio + timings + captions  ->  ffmpeg  ->  mp4
"""
from __future__ import annotations

import logging
import subprocess
from pathlib import Path

from app.schemas import AudioAsset, ImageAsset, VideoResult

logger = logging.getLogger("vaanireach.assembly")

FPS = 25
W, H = 1280, 720


def _run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{' '.join(cmd)}\n{proc.stderr[-1500:]}")


def assemble(
    language: str,
    images: list[ImageAsset],
    audio: AudioAsset,
    captions_path: str,
    workdir: str,
    out_path: str,
) -> VideoResult:
    work = Path(workdir)
    work.mkdir(parents=True, exist_ok=True)
    asset_by_scene = {i.scene_id: i.path for i in images}

    # 1) One clip per scene, each exactly as long as its narration segment.
    #    Supports real AI video clips (.mp4) and Ken Burns zoomed stills (.png/.jpg).
    clips: list[Path] = []
    for idx, t in enumerate(audio.timings):
        src = asset_by_scene.get(t.scene_id)
        if not src or not Path(src).exists():
            continue
        
        src_path = Path(src)
        dur = max(0.4, t.end_sec - t.start_sec)
        frames = max(1, int(dur * FPS))
        clip = work / f"clip_{idx:03d}.mp4"

        # Check if asset is a video clip (e.g. from Luma Dream Machine)
        if src_path.suffix.lower() in [".mp4", ".mov", ".webm", ".m4v"]:
            _run([
                "ffmpeg", "-y", "-loglevel", "error",
                "-stream_loop", "-1", "-i", str(src_path),
                "-vf", f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=yuv420p",
                "-t", f"{dur:.3f}", "-r", str(FPS), "-an",
                "-c:v", "libx264", "-preset", "ultrafast",
                str(clip),
            ])
        else:
            # Still image with Ken Burns slow zoom
            _run([
                "ffmpeg", "-y", "-loglevel", "error",
                "-loop", "1", "-i", str(src_path),
                "-vf", (f"scale={W*2}:{H*2},"
                        f"zoompan=z='min(zoom+0.0008,1.15)':d={frames}:s={W}x{H}:fps={FPS},"
                        f"format=yuv420p"),
                "-t", f"{dur:.3f}", "-r", str(FPS), "-an",
                "-c:v", "libx264", "-preset", "ultrafast",
                str(clip),
            ])
        clips.append(clip)

    if not clips:
        raise RuntimeError("assembly: no scene clips were produced")

    # 2) Concatenate scene clips.
    concat_file = work / "concat.txt"
    concat_file.write_text("".join(f"file '{c.resolve()}'\n" for c in clips))
    silent = work / "silent.mp4"
    _run([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(concat_file), "-c", "copy", str(silent)
    ])

    # 3) Mux narration audio + captions into final output video.
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Try muxing with embedded caption track (mov_text) for clean HTML5 video playback
    try:
        _run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(silent), "-i", audio.path,
            "-i", captions_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-c:s", "mov_text",
            "-shortest",
            out_path,
        ])
    except Exception:
        # Fallback to audio + video mux
        _run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(silent), "-i", audio.path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            out_path,
        ])

    return VideoResult(
        language=language,
        video_path=out_path,
        captions_path=captions_path,
        duration_sec=audio.duration_sec,
    )
