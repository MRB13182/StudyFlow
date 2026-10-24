# StudyFlow APK, updates and single-source branding

## Branding: one file only

Place your logo at `branding/logo.png`. Run:

```bash
python3 -m pip install Pillow
npm run branding:generate
npm run build
```

The generator validates the PNG, creates website favicons/PWA icons and generates Android legacy/adaptive launcher resources. The website header reads `/logo.png`; the favicon and manifest use generated files. For a new icon to appear on Android, a fresh APK must be built and installed as an update.

## Local Android debug build

Requirements: Node.js 22, npm, Python 3 with Pillow, Java 17, Android SDK, and the checked-in Gradle wrapper.

```bash
npm ci
npm run branding:generate
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
cd ..
bash scripts/verify-apk.sh
mkdir -p .build-outputs APK_DOWNLOAD
cp android/app/build/outputs/apk/debug/app-debug.apk .build-outputs/app-debug.apk
cp .build-outputs/app-debug.apk APK_DOWNLOAD/app-debug.apk
sha256sum .build-outputs/app-debug.apk APK_DOWNLOAD/app-debug.apk
```

## Automatic builds and releases

GitHub Actions builds the website and debug APK on qualifying pushes to `main`. The workflow uploads APK and metadata artifacts for downloading in the Actions run. To publish a release, push a tag such as `v1.1.1`. Confirm repository Actions settings allow workflow write access to repository contents/releases.

The release workflow must publish `app-debug.apk` and metadata containing the SHA-256 of that exact file. A debug APK is appropriate for testing. For reliable updates over existing installs, retain the same application ID and signing identity.

## In-app update behavior

The app compares the installed Android version code to `/release-metadata.json`. Update metadata must be deployed to a public HTTPS URL that matches the configured app. Only publish metadata after the APK upload completes. Android must show its package installer and may require the user to allow installs from this source. The app cannot silently install APKs or bypass user consent.

## Troubleshooting

- Missing `branding/logo.png`: add the user-provided image; no replacement artwork is fabricated.
- Android SDK/Gradle failure: review GitHub Actions logs and SDK configuration.
- Update not detected: verify metadata is reachable by HTTPS and the version code is greater.
- Update cannot replace an existing app: package ID and signing certificate must match.
