#!/usr/bin/env python3
"""Generate all website and Android logo assets from branding/logo.png."""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "branding" / "logo.png"
PUBLIC = ROOT / "public"
ANDROID = ROOT / "android/app/src/main/res"
BG = (79, 53, 232, 255)

def fit(src, target, size, background=None, safe=.80):
    im = src.copy().convert("RGBA")
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    im.thumbnail((int(size * safe), int(size * safe)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(im, ((size-im.width)//2, (size-im.height)//2))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, format="PNG", optimize=False)

def main():
    if not SOURCE.is_file():
        sys.exit("ERROR: missing branding/logo.png. Add your one source logo and rerun.")
    try:
        with Image.open(SOURCE) as probe: probe.verify()
        logo = Image.open(SOURCE).convert("RGBA")
    except Exception as exc:
        sys.exit(f"ERROR: branding/logo.png is invalid: {exc}")
    if logo.width < 32 or logo.height < 32:
        sys.exit("ERROR: logo dimensions must be at least 32x32.")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    logo.save(PUBLIC/"logo.png", format="PNG", optimize=False)
    for n in (16,32,48):
        fit(logo, PUBLIC/f"favicon-{n}x{n}.png", n, BG, .82)
    fit(logo, PUBLIC/"apple-touch-icon.png", 180, BG, .72)
    fit(logo, PUBLIC/"android-chrome-192x192.png", 192, BG, .72)
    fit(logo, PUBLIC/"android-chrome-512x512.png", 512, BG, .72)
    logo.copy().save(PUBLIC/"favicon.ico", format="ICO", sizes=[(16,16),(32,32),(48,48)])
    for folder,size in [("mipmap-mdpi",48),("mipmap-hdpi",72),("mipmap-xhdpi",96),("mipmap-xxhdpi",144),("mipmap-xxxhdpi",192)]:
        fit(logo,ANDROID/folder/"ic_launcher.png",size,BG,.72)
        fit(logo,ANDROID/folder/"ic_launcher_round.png",size,BG,.72)
        fit(logo,ANDROID/folder/"ic_launcher_foreground.png",size,None,.66)
    adaptive=ANDROID/"mipmap-anydpi-v26"
    adaptive.mkdir(parents=True,exist_ok=True)
    xml='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    for name in ("ic_launcher.xml","ic_launcher_round.xml"):
        (adaptive/name).write_text(xml,encoding="utf-8")
    values=ANDROID/"values"
    values.mkdir(parents=True,exist_ok=True)
    (values/"ic_launcher_background.xml").write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#4F35E8</color></resources>\n',encoding="utf-8")
    (PUBLIC/"site.webmanifest").write_text('''{
  "name": "Study Flow", "short_name": "StudyFlow",
  "description": "Student planner", "start_url": "/", "display": "standalone",
  "theme_color": "#4f35e8", "background_color": "#ffffff",
  "icons": [
    {"src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
''',encoding="utf-8")
    print("Brand assets generated from branding/logo.png")
if __name__ == "__main__": main()
