# Single-source branding

Place the one image you maintain at `branding/logo.png`. The branding generator validates that image and derives website favicons, PWA icons and Android launcher images from it. No other logo source is required.

Run `npm run branding:generate` then `npm run build`. For Android, the CI workflow synchronizes generated launcher resources before running Gradle. Keep the image square-ish for app icons; it is fitted within a safe area without distortion. The web header logo uses the source image and preserves its aspect ratio.
