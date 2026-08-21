"""
L2 — Dynamic Studio TV Monitor Graphic Generator.
Generates personalized, broadcast-grade digital TV monitor graphics tailored
to ANY uploaded document or notice (Scholarships, Recall Orders, Health Advisories,
DBT Welfare, Transport, Taxation, etc.) in < 30ms.
"""
from __future__ import annotations

import logging
from pathlib import Path
import textwrap
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("vaanireach.studio_graphic")

W, H = 1280, 720


def get_system_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Find and load a clean system TrueType font with fallbacks."""
    font_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Supplemental/Trebuchet MS.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Geneva.ttf",
    ]
    for p in font_candidates:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def render_document_studio_frame(
    base_img_path: str | Path,
    title: str,
    category: str = "Official Notice",
    department: str = "Government of India",
    bullet_points: list[str] | None = None,
    out_path: str | Path | None = None,
) -> Image.Image:
    """
    Renders a tailored, photorealistic TV broadcast monitor graphic
    directly onto the digital display screen in the studio frame.
    
    Widescreen TV Monitor Region in 1280x720 frame:
      Left boundary:   x = 0
      Top boundary:    y = 7
      Right boundary:  x = 677 (wall bezel edge)
      Desk boundary:   y = 445 (glass desk foreground)
    """
    orig = Image.open(base_img_path).convert("RGBA").resize((W, H))

    sw, sh = 677, 440
    screen = Image.new("RGBA", (sw, sh), (0, 0, 0, 255))
    sdraw = ImageDraw.Draw(screen)

    # 1. Categorical Theme Color Mapping
    cat_lower = (category or "").lower()
    if any(k in cat_lower for k in ["recall", "urgent", "danger", "warning", "safety"]):
        theme_bg_start = (35, 10, 20)
        theme_bg_end = (65, 18, 30)
        theme_accent = (239, 68, 68)     # Bright Crimson
        theme_sub_accent = (251, 146, 60) # Amber orange
        cat_badge = "URGENT PUBLIC NOTICE"
    elif any(k in cat_lower for k in ["health", "medical", "hospital", "pharma"]):
        theme_bg_start = (6, 28, 32)
        theme_bg_end = (13, 50, 56)
        theme_accent = (20, 184, 166)    # Teal
        theme_sub_accent = (45, 212, 191)
        cat_badge = "HEALTH ADVISORY"
    elif any(k in cat_lower for k in ["agriculture", "kisan", "farmer", "welfare"]):
        theme_bg_start = (8, 30, 18)
        theme_bg_end = (16, 56, 32)
        theme_accent = (34, 197, 94)     # Emerald Green
        theme_sub_accent = (234, 179, 8)  # Gold
        cat_badge = "FARMER WELFARE"
    elif any(k in cat_lower for k in ["scholarship", "education", "student", "ugc", "swayam", "exam", "result"]):
        theme_bg_start = (10, 22, 54)
        theme_bg_end = (20, 42, 90)
        theme_accent = (59, 130, 246)    # Royal Blue
        theme_sub_accent = (245, 158, 11) # Gold amber
        cat_badge = "OFFICIAL PUBLIC NOTICE"
    else:
        theme_bg_start = (10, 22, 54)
        theme_bg_end = (20, 42, 90)
        theme_accent = (59, 130, 246)
        theme_sub_accent = (245, 158, 11)
        cat_badge = category.upper()[:25] if category else "OFFICIAL NOTICE"

    # 2. Dark Studio LED Video Wall Gradient
    for y in range(sh):
        t = y / float(sh)
        r = int(theme_bg_start[0] + t * (theme_bg_end[0] - theme_bg_start[0]))
        g = int(theme_bg_start[1] + t * (theme_bg_end[1] - theme_bg_start[1]))
        b = int(theme_bg_start[2] + t * (theme_bg_end[2] - theme_bg_start[2]))
        sdraw.line([(0, y), (sw, y)], fill=(r, g, b, 255), width=1)

    # Ambient broadcast curves
    sdraw.arc([-80, sh - 200, sw + 100, sh + 180], start=180, end=360, fill=(*theme_accent, 120), width=3)
    sdraw.arc([-50, sh - 160, sw + 120, sh + 220], start=180, end=360, fill=(*theme_sub_accent, 160), width=4)

    # 3. Header Bar
    sdraw.rectangle([(0, 0), (sw, 64)], fill=(15, 23, 42, 230))
    sdraw.line([(0, 64), (sw, 64)], fill=(*theme_accent, 180), width=2)

    dept_text = (department or "GOVERNMENT OF INDIA").upper()[:40]
    sdraw.text((40, 16), dept_text, fill=(241, 245, 249, 255), font=get_system_font(13, bold=True))
    sdraw.text((40, 36), "PUBLIC INFORMATION & OUTREACH DESK", fill=(148, 163, 184, 255), font=get_system_font(11, bold=True))

    # Live Official Notice Pill Badge
    badge_w = len(cat_badge) * 7 + 36
    bx1 = sw - badge_w - 20
    sdraw.rounded_rectangle([bx1, 16, bx1 + badge_w, 46], radius=5, fill=(*theme_accent, 40), outline=(*theme_accent, 240), width=1)
    sdraw.ellipse([bx1 + 10, 27, bx1 + 18, 35], fill=(239, 68, 68, 255))
    sdraw.text((bx1 + 24, 24), cat_badge, fill=(255, 255, 255, 255), font=get_system_font(10, bold=True))

    # 4. Main Document Title
    clean_title = (title or "Official Public Announcement").strip()
    wrapped_title = textwrap.wrap(clean_title, width=38)
    ty = 88
    for line in wrapped_title[:3]:
        sdraw.text((40, ty), line, fill=(255, 255, 255, 255), font=get_system_font(22, bold=True))
        ty += 32

    # Accent divider ribbon
    sdraw.line([(40, ty + 4), (260, ty + 4)], fill=(*theme_sub_accent, 255), width=3)
    ty += 18

    # 5. Bullet Points / Key Findings
    if not bullet_points or len(bullet_points) == 0:
        bullet_points = [
            "Official circular released for nationwide citizen outreach.",
            "Review verified terms, eligibility, and procedures on the portal.",
            "Submit applications or compliance reports before the deadline.",
        ]

    for idx, b in enumerate(bullet_points[:3]):
        # Number badge
        sdraw.rounded_rectangle([(40, ty), (68, ty + 22)], radius=4, fill=(*theme_accent, 90), outline=(*theme_accent, 160), width=1)
        sdraw.text((48, ty + 4), f"0{idx+1}", fill=(220, 240, 255, 255), font=get_system_font(11, bold=True))
        
        b_wrap = textwrap.wrap(b.strip(), width=54)
        for bl in b_wrap:
            sdraw.text((80, ty + 1), bl, fill=(226, 232, 240, 255), font=get_system_font(14, bold=True))
            ty += 22
        ty += 8

    # 6. Composite seamlessly with zero cutout seams
    final_base = orig.copy()
    final_base.paste(screen, (0, 7))

    # Right side of the studio (Anchor, lighting, wall) from x=677 to 1280
    right_side = orig.crop((677, 0, 1280, 720))
    final_base.paste(right_side, (677, 0))

    # Curved glass desk foreground from y=445 to 720
    desk_crop = orig.crop((0, 445, 1280, 720))
    final_base.paste(desk_crop, (0, 445))

    final_rgb = final_base.convert("RGB")

    if out_path:
        out_p = Path(out_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        final_rgb.save(str(out_p), quality=95)
        logger.info(f"Generated seamless widescreen studio frame at: {out_p}")

    return final_rgb

