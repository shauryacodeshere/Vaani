"""
L3 — High Quality AI Indian Presenter Graphic Card Provider.
Composes the photorealistic AI Indian presenter with clean official notice lower-thirds and typography.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from app.providers.base import VisualProvider
from app.schemas import ImageAsset, Scene

W, H = 1280, 720


class TitleCardVisualProvider(VisualProvider):
    name: str = "title_card"

    async def get_image(self, scene: Scene, out_path: str) -> ImageAsset:
        out_file = Path(out_path).with_suffix(".png")
        out_file.parent.mkdir(parents=True, exist_ok=True)

        # 1. Check for presenter background assets
        asset_dir = Path(__file__).resolve().parents[2] / "assets"
        presenter_file = asset_dir / "presenter_female.jpg"
        if not presenter_file.exists():
            presenter_file = asset_dir / "presenter_male.jpg"

        if presenter_file.exists():
            base_img = Image.open(presenter_file).convert("RGBA")
            base_img = base_img.resize((W, H), Image.Resampling.LANCZOS)
        else:
            base_img = Image.new("RGBA", (W, H), "#0b132b")
            draw_bg = ImageDraw.Draw(base_img)
            for i in range(H):
                r = int(11 + (28 - 11) * (i / H))
                g = int(19 + (45 - 19) * (i / H))
                b = int(43 + (80 - 43) * (i / H))
                draw_bg.line([(0, i), (W, i)], fill=(r, g, b, 255))

        # 2. Add modern translucent broadcast lower-third overlay
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # Lower-third box with subtle gradient
        lower_third_y = H - 180
        draw.rectangle([(40, lower_third_y), (W - 40, H - 30)], fill=(15, 23, 42, 220), outline=(59, 130, 246, 255), width=2)
        draw.rectangle([(40, lower_third_y), (W - 40, lower_third_y + 8)], fill=(37, 99, 235, 255))

        # 3. Load typography
        try:
            font_badge = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
            font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
            font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        except Exception:
            font_badge = font_title = font_sub = ImageFont.load_default()

        # Top live broadcast badge
        draw.rectangle([(60, 40), (220, 80)], fill=(225, 29, 72, 230))
        draw.text((75, 48), "● OFFICIAL", fill=(255, 255, 255, 255), font=font_badge)

        # Topic & Visual Keywords
        kw_text = " • ".join(scene.visual_keywords) if scene.visual_keywords else "Public Information Notice"
        draw.text((65, lower_third_y + 20), kw_text.upper()[:60], fill=(56, 189, 248, 255), font=font_sub)

        # Scene spoken text line
        text_snippet = scene.text
        if len(text_snippet) > 85:
            text_snippet = text_snippet[:82] + "..."
        draw.text((65, lower_third_y + 55), text_snippet, fill=(248, 250, 252, 255), font=font_title)

        # Composite overlay
        final_img = Image.alpha_composite(base_img, overlay).convert("RGB")
        final_img.save(str(out_file), "PNG")

        return ImageAsset(
            scene_id=scene.scene_id,
            path=str(out_file),
            provider="ai_presenter_studio",
            is_fallback=True,
        )
