# StudyFlow Branding Assets

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
