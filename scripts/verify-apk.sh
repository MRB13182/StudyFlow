#!/usr/bin/env bash
set -euo pipefail
APK="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
test -f "$APK" || { echo "Missing APK: $APK" >&2; exit 1; }
SIZE=$(stat -c%s "$APK")
test "$SIZE" -gt 1000000 || { echo "APK is smaller than 1 MB ($SIZE bytes)" >&2; exit 1; }
unzip -t "$APK" >/dev/null
if command -v apkanalyzer >/dev/null 2>&1; then
  apkanalyzer manifest application-id "$APK"
  apkanalyzer manifest version-code "$APK"
  apkanalyzer manifest version-name "$APK"
elif command -v aapt >/dev/null 2>&1; then
  aapt dump badging "$APK" | head -n 1
else
  echo "WARNING: APK metadata tooling unavailable; ZIP integrity verified only." >&2
fi
printf 'APK size: %s bytes\n' "$SIZE"
sha256sum "$APK"
