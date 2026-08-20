"""
L2 — Video assembly. Deterministic. No AI calls in this file, ever.

Same inputs always produce the same video, which means a bad render is a bug
you can reproduce rather than a model that felt different that time.

    images + audio + timings + captions  ->  ffmpeg  ->  mp4
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from app.schemas import AudioAsset, ImageAsset, VideoResult

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
    img_by_scene = {i.scene_id: i.path for i in images}

    # 1) One clip per scene, each exactly as long as its narration segment,
    #    with a slow Ken Burns zoom so stills don't read as a static slideshow.
    clips: list[Path] = []
    for idx, t in enumerate(audio.timings):
        src = img_by_scene.get(t.scene_id)
        if not src:
            continue
        dur = max(0.4, t.end_sec - t.start_sec)
        frames = max(1, int(dur * FPS))
        clip = work / f"clip_{idx:03d}.mp4"
        _run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-loop", "1", "-i", src,
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
    _run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
          "-i", str(concat_file), "-c", "copy", str(silent)])

    # 3) Mux narration + burn in captions.
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    subs = str(Path(captions_path).resolve()).replace(":", r"\:")
    _run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(silent), "-i", audio.path,
        "-vf", (f"subtitles='{subs}':force_style="
                "'FontSize=20,PrimaryColour=&HFFFFFF&,BorderStyle=3,"
                "Outline=1,BackColour=&H80000000&,MarginV=40'"),
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-shortest",
        out_path,
    ])

    return VideoResult(
        language=language,
        video_path=out_path,
        captions_path=captions_path,
        duration_sec=audio.duration_sec,
    )
