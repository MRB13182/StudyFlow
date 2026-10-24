#!/usr/bin/env python3
"""Generate website and Android branding assets from branding/logo.png."""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "branding" / "logo.png"
PUBLIC = ROOT / "public"
ANDROID = ROOT / "android" / "app" / "src" / "main" / "res"
BG = (79, 53, 232, 255)

def save_fit(src, target, size, background=None, safe=0.80):
    image = src.copy().convert("RGBA")
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    image.thumbnail((int(size * safe), int(size * safe)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, format="PNG", optimize=False)

def main():
    if not SOURCE.is_file():
        sys.exit("ERROR: branding/logo.png is missing. Add your logo and rerun.")
    try:
        with Image.open(SOURCE) as image:
            image.verify()
        src = Image.open(SOURCE).convert("RGBA")
    except Exception as exc:
        sys.exit(f"ERROR: branding/logo.png is not a valid supported image: {exc}")
    if src.width < 32 or src.height < 32:
        sys.exit("ERROR: branding/logo.png must be at least 32 x 32 pixels.")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    src.save(PUBLIC / "logo.png", format="PNG", optimize=False)
    for size, filename in [(16, "favicon-16x16.png"), (32, "favicon-32x32.png"), (48, "favicon-48x48.png")]:
        save_fit(src, PUBLIC / filename, size, BG, .82)
    save_fit(src, PUBLIC / "apple-touch-icon.png", 180, BG, .72)
    save_fit(src, PUBLIC / "android-chrome-192x192.png", 192, BG, .72)
    save_fit(src, PUBLIC / "android-chrome-512x512.png", 512, BG, .72)
    src.thumbnail((256, 256), Image.Resampling.LANCZOS)
    src.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    for folder, size in [("mipmap-mdpi", 48), ("mipmap-hdpi", 72), ("mipmap-xhdpi", 96),
                         ("mipmap-xxhdpi", 144), ("mipmap-xxxhdpi", 192)]:
        save_fit(src, ANDROID / folder / "ic_launcher.png", size, BG, .72)
        save_fit(src, ANDROID / folder / "ic_launcher_round.png", size, BG, .72)
        save_fit(src, ANDROID / folder / "ic_launcher_foreground.png", size, None, .66)

    anydpi = ANDROID / "mipmap-anydpi-v26"
    anydpi.mkdir(parents=True, exist_ok=True)
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    (anydpi / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (anydpi / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")
    values = ANDROID / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#4F35E8</color></resources>\n',
        encoding="utf-8"
    )
    (PUBLIC / "site.webmanifest").write_text('''{
  "name": "Study Flow",
  "short_name": "StudyFlow",
  "description": "Student planner",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4f35e8",
  "background_color": "#ffffff",
  "icons": [
    {"src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
''', encoding="utf-8")
    print("Generated website and Android icon assets from branding/logo.png")

if __name__ == "__main__":
    main()
