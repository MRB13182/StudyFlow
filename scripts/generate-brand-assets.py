#!/usr/bin/env python3
import os
import math
from PIL import Image, ImageDraw, ImageFont

def ensure_dirs():
    dirs = [
        "BRANDING_ASSETS/logo",
        "BRANDING_ASSETS/favicon",
        "BRANDING_ASSETS/app-icon/source",
        "BRANDING_ASSETS/app-icon/android/mipmap-mdpi",
        "BRANDING_ASSETS/app-icon/android/mipmap-hdpi",
        "BRANDING_ASSETS/app-icon/android/mipmap-xhdpi",
        "BRANDING_ASSETS/app-icon/android/mipmap-xxhdpi",
        "BRANDING_ASSETS/app-icon/android/mipmap-xxxhdpi",
        "BRANDING_ASSETS/preview",
        "public"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

# 1. Generate SVGs
def create_svgs():
    # Logo SVG (full brand lockup)
    logo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 120" fill="none">
  <defs>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="50%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#818CF8"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  
  <!-- Icon Mark Container -->
  <g transform="translate(10, 10)">
    <!-- Base Glow / Rounded Tile -->
    <rect x="0" y="0" width="100" height="100" rx="26" fill="url(#primaryGrad)" filter="drop-shadow(0 8px 16px rgba(79, 70, 229, 0.35))"/>
    
    <!-- Inner Accent Ring -->
    <rect x="2" y="2" width="96" height="96" rx="24" stroke="rgba(255, 255, 255, 0.22)" stroke-width="1.5" fill="none"/>
    
    <!-- Stylized Academic Cap -->
    <!-- Cap Rhombus (Top) -->
    <path d="M50 25 L82 41 L50 57 L18 41 Z" fill="#FFFFFF"/>
    
    <!-- Cap Under Skullcap Body -->
    <path d="M26 46.5 V61 C26 70 36.5 75 50 75 C63.5 75 74 70 74 61 V46.5 L50 58.5 Z" fill="rgba(255, 255, 255, 0.88)"/>
    
    <!-- Tassel String and Pendant -->
    <path d="M50 41 Q68 45 74 58" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="74" cy="60" r="3.5" fill="#38BDF8"/>
    
    <!-- Sparkle / Flow Energy -->
    <path d="M80 22 Q83 28 89 31 Q83 34 80 40 Q77 34 71 31 Q77 28 80 22 Z" fill="url(#sparkGrad)"/>
    <circle cx="24" cy="28" r="2.5" fill="#38BDF8"/>
  </g>

  <!-- Typography -->
  <g transform="translate(128, 42)">
    <!-- Study -->
    <text x="0" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="42" font-weight="800" fill="#0F172A" letter-spacing="-1.2">Study<tspan fill="url(#primaryGrad)">Flow</tspan></text>
    <!-- Subtitle / Eyebrow -->
    <text x="2" y="56" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" font-size="11.5" font-weight="700" fill="#64748B" letter-spacing="2.4">AI-POWERED STUDENT PLANNER</text>
  </g>
</svg>'''

    # Dark Logo (for dark themes / splash screens)
    logo_dark_svg = logo_svg.replace('fill="#0F172A"', 'fill="#F8FAFC"').replace('fill="#64748B"', 'fill="#94A3B8"')

    # Light Logo (explicit white canvas preview)
    logo_light_svg = logo_svg

    # Favicon SVG (compact icon mark)
    favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <linearGradient id="favGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="50%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
    <linearGradient id="favSpark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#818CF8"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="34" fill="url(#favGrad)"/>
  <rect x="2" y="2" width="124" height="124" rx="32" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  
  <!-- Cap Rhombus (Top) -->
  <path d="M64 32 L105 52 L64 72 L23 52 Z" fill="#FFFFFF"/>
  <!-- Cap Under Skullcap Body -->
  <path d="M33 59 V77 C33 89 46 95 64 95 C82 95 95 89 95 77 V59 L64 74 Z" fill="rgba(255, 255, 255, 0.90)"/>
  <!-- Tassel -->
  <path d="M64 52 Q87 57 95 74" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="95" cy="76" r="4.5" fill="#38BDF8"/>
  <!-- AI Sparkle -->
  <path d="M102 28 Q106 36 114 40 Q106 44 102 52 Q98 44 90 40 Q98 36 102 28 Z" fill="url(#favSpark)"/>
</svg>'''

    # Master App Icon SVG
    app_icon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="appGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1"/>
      <stop offset="45%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#1E40AF"/>
    </linearGradient>
    <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EDF2F7"/>
    </linearGradient>
    <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#818CF8"/>
    </linearGradient>
    <filter id="appShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#1E1B4B" flood-opacity="0.45"/>
    </filter>
  </defs>
  
  <!-- Outer App Background Container -->
  <rect width="512" height="512" rx="128" fill="url(#appGrad)"/>
  <rect x="6" y="6" width="500" height="500" rx="122" stroke="rgba(255, 255, 255, 0.25)" stroke-width="6"/>

  <!-- Academic Cap Symbol -->
  <g filter="url(#appShadow)">
    <!-- Top Rhombus -->
    <path d="M256 128 L420 212 L256 296 L92 212 Z" fill="url(#capGrad)"/>
    
    <!-- Under Skullcap Neck -->
    <path d="M132 238 V316 C132 364 186 388 256 388 C326 388 380 364 380 316 V238 L256 302 Z" fill="rgba(255, 255, 255, 0.92)"/>
    
    <!-- Cyan Tassel -->
    <path d="M256 212 Q348 232 380 300" stroke="#38BDF8" stroke-width="16" stroke-linecap="round" fill="none"/>
    <circle cx="380" cy="308" r="18" fill="#38BDF8"/>
    
    <!-- AI Focus Sparkle -->
    <path d="M408 112 Q424 144 456 160 Q424 176 408 208 Q392 176 360 160 Q392 144 408 112 Z" fill="url(#sparkleGrad)"/>
    <circle cx="120" cy="140" r="10" fill="#38BDF8"/>
  </g>
</svg>'''

    # Write SVGs
    with open("BRANDING_ASSETS/logo/logo.svg", "w") as f: f.write(logo_svg)
    with open("BRANDING_ASSETS/logo/logo-dark.svg", "w") as f: f.write(logo_dark_svg)
    with open("BRANDING_ASSETS/logo/logo-light.svg", "w") as f: f.write(logo_light_svg)
    with open("BRANDING_ASSETS/favicon/favicon.svg", "w") as f: f.write(favicon_svg)
    with open("BRANDING_ASSETS/app-icon/source/app-icon-master.svg", "w") as f: f.write(app_icon_svg)

    # Mirror for public web delivery
    with open("public/logo.svg", "w") as f: f.write(logo_svg)
    with open("public/favicon.svg", "w") as f: f.write(favicon_svg)

# 2. Render Bitmap Assets with High-Fidelity PIL Rendering
def render_app_icon(size, transparent=False, round_icon=False, foreground_only=False):
    # Supersample at 2x for smooth antialiasing
    scale = 2
    canvas_size = size * scale
    im = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    if not foreground_only:
        # Background gradient tile
        bg_im = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg_im)
        # Vertical gradient simulation from #6366F1 (99, 102, 241) to #1E40AF (30, 64, 175)
        for y in range(canvas_size):
            t = y / max(1, canvas_size - 1)
            r = int(99 + (30 - 99) * t)
            g = int(102 + (64 - 102) * t)
            b = int(241 + (175 - 241) * t)
            bg_draw.line([(0, y), (canvas_size, y)], fill=(r, g, b, 255))

        # Mask for rounded rectangle or circle
        mask = Image.new("L", (canvas_size, canvas_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        if round_icon:
            mask_draw.ellipse([0, 0, canvas_size - 1, canvas_size - 1], fill=255)
        else:
            rx = int(canvas_size * 0.25)
            mask_draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=rx, fill=255)

        im.paste(bg_im, (0, 0), mask)

        # Subtle white top inner border
        if not round_icon:
            rx = int(canvas_size * 0.25)
            draw.rounded_rectangle([scale * 2, scale * 2, canvas_size - scale * 2 - 1, canvas_size - scale * 2 - 1], radius=rx - scale * 2, outline=(255, 255, 255, 65), width=max(1, int(3 * scale)))
        else:
            draw.ellipse([scale * 2, scale * 2, canvas_size - scale * 2 - 1, canvas_size - scale * 2 - 1], outline=(255, 255, 255, 65), width=max(1, int(3 * scale)))

    # Draw Cap and Details
    # Coordinates normalized to [0, 512]
    cx = canvas_size / 2
    cy = canvas_size / 2
    s = canvas_size / 512.0

    # Cap Top Rhombus
    top_poly = [
        (256 * s, 130 * s),
        (420 * s, 214 * s),
        (256 * s, 298 * s),
        (92 * s, 214 * s)
    ]
    draw.polygon(top_poly, fill=(255, 255, 255, 255))

    # Cap Neck / Skullcap
    neck_poly = [
        (134 * s, 240 * s),
        (134 * s, 316 * s),
        (190 * s, 380 * s),
        (256 * s, 388 * s),
        (322 * s, 380 * s),
        (378 * s, 316 * s),
        (378 * s, 240 * s),
        (256 * s, 302 * s)
    ]
    draw.polygon(neck_poly, fill=(240, 244, 255, 235))

    # Cyan Tassel
    draw.line([(256 * s, 214 * s), (320 * s, 230 * s), (380 * s, 304 * s)], fill=(56, 189, 248, 255), width=max(1, int(15 * s)), joint="curve")
    tassel_r = 17 * s
    draw.ellipse([380 * s - tassel_r, 308 * s - tassel_r, 380 * s + tassel_r, 308 * s + tassel_r], fill=(56, 189, 248, 255))

    # Sparkle Star at top right
    def draw_star(center_x, center_y, arm_len, fill_col):
        pts = []
        for i in range(8):
            ang = i * (math.pi / 4)
            r = arm_len if (i % 2 == 0) else arm_len * 0.35
            pts.append((center_x + r * math.cos(ang), center_y + r * math.sin(ang)))
        draw.polygon(pts, fill=fill_col)

    draw_star(408 * s, 160 * s, 48 * s, (56, 189, 248, 255))
    draw_star(120 * s, 140 * s, 14 * s, (56, 189, 248, 255))

    # Downsample using LANCZOS for crystal clear rendering
    return im.resize((size, size), Image.Resampling.LANCZOS)

def create_logo_png(w=520, h=120, transparent=True):
    scale = 2
    sw, sh = w * scale, h * scale
    im = Image.new("RGBA", (sw, sh), (0, 0, 0, 0) if transparent else (255, 255, 255, 255))
    draw = ImageDraw.Draw(im)

    # Left Icon Tile (100x100 at x=10, y=10)
    tile_size = 100 * scale
    tile_x = 10 * scale
    tile_y = 10 * scale
    rx = int(26 * scale)

    # Tile Background
    tile_im = Image.new("RGBA", (tile_size, tile_size), (0, 0, 0, 0))
    tile_draw = ImageDraw.Draw(tile_im)
    for y in range(tile_size):
        t = y / max(1, tile_size - 1)
        r = int(99 + (37 - 99) * t)
        g = int(102 + (99 - 102) * t)
        b = int(241 + (235 - 241) * t)
        tile_draw.line([(0, y), (tile_size, y)], fill=(r, g, b, 255))

    tile_mask = Image.new("L", (tile_size, tile_size), 0)
    tile_mask_draw = ImageDraw.Draw(tile_mask)
    tile_mask_draw.rounded_rectangle([0, 0, tile_size - 1, tile_size - 1], radius=rx, fill=255)
    im.paste(tile_im, (tile_x, tile_y), tile_mask)
    draw.rounded_rectangle([tile_x + 2, tile_y + 2, tile_x + tile_size - 3, tile_y + tile_size - 3], radius=rx - 2, outline=(255, 255, 255, 60), width=max(1, int(2 * scale)))

    # Draw Cap inside tile
    s = tile_size / 512.0
    top_poly = [
        (tile_x + 256 * s, tile_y + 130 * s),
        (tile_x + 420 * s, tile_y + 214 * s),
        (tile_x + 256 * s, tile_y + 298 * s),
        (tile_x + 92 * s, tile_y + 214 * s)
    ]
    draw.polygon(top_poly, fill=(255, 255, 255, 255))
    neck_poly = [
        (tile_x + 134 * s, tile_y + 240 * s),
        (tile_x + 134 * s, tile_y + 316 * s),
        (tile_x + 190 * s, tile_y + 380 * s),
        (tile_x + 256 * s, tile_y + 388 * s),
        (tile_x + 322 * s, tile_y + 380 * s),
        (tile_x + 378 * s, tile_y + 316 * s),
        (tile_x + 378 * s, tile_y + 240 * s),
        (tile_x + 256 * s, tile_y + 302 * s)
    ]
    draw.polygon(neck_poly, fill=(240, 244, 255, 235))
    draw.line([(tile_x + 256 * s, tile_y + 214 * s), (tile_x + 320 * s, tile_y + 230 * s), (tile_x + 380 * s, tile_y + 304 * s)], fill=(56, 189, 248, 255), width=max(1, int(15 * s)))
    draw.ellipse([tile_x + 380 * s - 17 * s, tile_y + 308 * s - 17 * s, tile_x + 380 * s + 17 * s, tile_y + 308 * s + 17 * s], fill=(56, 189, 248, 255))

    # Text rendering with default clean font fallback
    # Since freetype fonts might vary, use default clean bitmap or standard system fonts if available
    font_large = None
    font_small = None
    font_candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    ]
    for fc in font_candidates:
        if os.path.exists(fc):
            font_large = ImageFont.truetype(fc, int(42 * scale))
            font_small = ImageFont.truetype(fc, int(12 * scale))
            break
    if not font_large:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    text_x = int(128 * scale)
    text_y = int(32 * scale)
    draw.text((text_x, text_y), "Study", fill=(15, 23, 42, 255), font=font_large)
    study_bbox = draw.textbbox((text_x, text_y), "Study", font=font_large)
    flow_x = study_bbox[2]
    draw.text((flow_x, text_y), "Flow", fill=(79, 70, 229, 255), font=font_large)
    draw.text((text_x + 2, text_y + int(48 * scale)), "AI-POWERED STUDENT PLANNER", fill=(100, 116, 139, 255), font=font_small)

    return im.resize((w, h), Image.Resampling.LANCZOS)

def create_preview_sheet():
    w, h = 1200, 630
    im = Image.new("RGBA", (w, h), (15, 23, 42, 255))
    draw = ImageDraw.Draw(im)

    # Radial/conic glow in background
    for r in range(400, 0, -8):
        alpha = int(45 * (1 - r / 400.0))
        draw.ellipse([600 - r, 200 - r, 600 + r, 200 + r], fill=(79, 70, 229, alpha))

    # Place Center 180x180 App Icon
    app_icon = render_app_icon(180)
    im.paste(app_icon, (600 - 90, 120), app_icon)

    font_title = None
    font_sub = None
    for fc in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
        if os.path.exists(fc):
            font_title = ImageFont.truetype(fc, 56)
            font_sub = ImageFont.truetype(fc, 22)
            break
    if not font_title:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    draw.text((430, 330), "Study", fill=(255, 255, 255, 255), font=font_title)
    draw.text((595, 330), "Flow", fill=(129, 140, 248, 255), font=font_title)
    draw.text((360, 410), "AI-Powered Student Study Planner & Routine Suite", fill=(148, 163, 184, 255), font=font_sub)
    draw.text((455, 460), "Official Brand Assets & Android APK v1.1.0", fill=(56, 189, 248, 255), font=font_sub)

    return im

def main():
    ensure_dirs()
    print("Generating SVGs...")
    create_svgs()

    print("Generating App Icons...")
    master_icon = render_app_icon(512)
    master_icon.save("BRANDING_ASSETS/app-icon/source/app-icon-master.png")

    # Android launcher icons for various densities
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    for folder, size in densities.items():
        base = render_app_icon(size)
        base.save(f"BRANDING_ASSETS/app-icon/android/{folder}/ic_launcher.png")
        round_icon = render_app_icon(size, round_icon=True)
        round_icon.save(f"BRANDING_ASSETS/app-icon/android/{folder}/ic_launcher_round.png")
        fg = render_app_icon(size, foreground_only=True)
        fg.save(f"BRANDING_ASSETS/app-icon/android/{folder}/ic_launcher_foreground.png")

    print("Generating Logos...")
    logo_trans = create_logo_png(520, 120, transparent=True)
    logo_trans.save("BRANDING_ASSETS/logo/logo.png")
    logo_trans.save("BRANDING_ASSETS/logo/logo-transparent.png")
    logo_trans.save("public/logo.png")

    print("Generating Favicons & Web Icons...")
    fav16 = render_app_icon(16)
    fav16.save("BRANDING_ASSETS/favicon/favicon-16x16.png")
    fav16.save("public/favicon-16x16.png")

    fav32 = render_app_icon(32)
    fav32.save("BRANDING_ASSETS/favicon/favicon-32x32.png")
    fav32.save("public/favicon-32x32.png")

    touch180 = render_app_icon(180)
    touch180.save("BRANDING_ASSETS/favicon/apple-touch-icon.png")
    touch180.save("public/apple-touch-icon.png")

    chrome192 = render_app_icon(192)
    chrome192.save("BRANDING_ASSETS/favicon/android-chrome-192x192.png")
    chrome192.save("public/android-chrome-192x192.png")

    chrome512 = render_app_icon(512)
    chrome512.save("BRANDING_ASSETS/favicon/android-chrome-512x512.png")
    chrome512.save("public/android-chrome-512x512.png")

    # Generate real favicon.ico containing 16, 32, 48
    fav32.save("BRANDING_ASSETS/favicon/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    fav32.save("public/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    # Generate site.webmanifest
    manifest_content = '''{
  "name": "Study Flow — AI-Powered Student Planner",
  "short_name": "StudyFlow",
  "description": "Organize subjects, manage your time, and build an AI-powered study routine that fits your life.",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4f35e8",
  "background_color": "#0d132e",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
'''
    with open("BRANDING_ASSETS/favicon/site.webmanifest", "w") as f:
        f.write(manifest_content)
    with open("public/site.webmanifest", "w") as f:
        f.write(manifest_content)

    print("Generating Branding Preview Sheet...")
    preview = create_preview_sheet()
    preview.save("BRANDING_ASSETS/preview/branding-preview.png")

    # README for BRANDING_ASSETS
    branding_readme = '''# StudyFlow Branding Assets

Official brand mark, typography, favicon, and application icon specifications for StudyFlow — AI-Powered Student Planner.

## Directory Structure

```
BRANDING_ASSETS/
├── README.md                          # Asset guide and usage rules
├── logo/
│   ├── logo.svg                       # Primary scalable vector brand logo (light/default)
│   ├── logo.png                       # High-resolution PNG logo with transparency (520x120)
│   ├── logo-dark.svg                  # Vector logo optimized for dark backgrounds
│   ├── logo-light.svg                 # Vector logo optimized for light backgrounds
│   └── logo-transparent.png           # 32-bit transparent PNG lockup
├── favicon/
│   ├── favicon.svg                    # Scalable vector favicon
│   ├── favicon.ico                    # Multi-resolution ICO (16x16, 32x32, 48x48)
│   ├── favicon-16x16.png              # Standard desktop browser favicon
│   ├── favicon-32x32.png              # Retina browser favicon
│   ├── apple-touch-icon.png           # iOS home screen bookmark icon (180x180)
│   ├── android-chrome-192x192.png     # Android PWA home icon (192x192)
│   ├── android-chrome-512x512.png     # Android splash icon (512x512)
│   └── site.webmanifest               # W3C Web Application Manifest
├── app-icon/
│   ├── README.md                      # Android launcher integration guide
│   ├── source/
│   │   ├── app-icon-master.svg        # Scalable master app vector
│   │   └── app-icon-master.png        # 512x512 master high-resolution icon
│   └── android/
│       ├── mipmap-mdpi/               # 48x48 launcher icons (standard, round, foreground)
│       ├── mipmap-hdpi/               # 72x72 launcher icons
│       ├── mipmap-xhdpi/              # 96x96 launcher icons
│       ├── mipmap-xxhdpi/             # 144x144 launcher icons
│       └── mipmap-xxxhdpi/            # 192x192 launcher icons
└── preview/
    └── branding-preview.png           # Visual brand showcase sheet (1200x630)
```

## Brand Colors

- **Primary Indigo**: `#4F46E5` / `#6366F1`
- **Cobalt Blue**: `#2563EB` / `#1E40AF`
- **Cyan Energy Spark**: `#38BDF8`
- **Deep Slate Canvas**: `#0F172A`
- **Soft Text**: `#94A3B8` / `#64748B`

## Integration

- **Web Header**: Included via `/logo.svg` or `/public/logo.png`.
- **HTML Meta**: Linked via `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, and `/site.webmanifest`.
- **Android APK**: Native launcher icons installed in `android/app/src/main/res/mipmap-*`.
'''
    with open("BRANDING_ASSETS/README.md", "w") as f:
        f.write(branding_readme)

    app_icon_readme = '''# StudyFlow Android App Icons

This folder contains the master vector and density-specific launcher icon assets for Android.

## Android Launcher Icon Densities

- `mipmap-mdpi`: 48 × 48 px (1.0x baseline)
- `mipmap-hdpi`: 72 × 72 px (1.5x)
- `mipmap-xhdpi`: 96 × 96 px (2.0x)
- `mipmap-xxhdpi`: 144 × 144 px (3.0x)
- `mipmap-xxxhdpi`: 192 × 192 px (4.0x)

## Resource Files per Density

1. `ic_launcher.png`: Standard square/squircle launcher icon.
2. `ic_launcher_round.png`: Circular launcher icon for round icon launchers.
3. `ic_launcher_foreground.png`: Foreground layer for Android Adaptive Icons (API 26+).
'''
    with open("BRANDING_ASSETS/app-icon/README.md", "w") as f:
        f.write(app_icon_readme)

    print("All branding assets successfully created!")

if __name__ == "__main__":
    main()
