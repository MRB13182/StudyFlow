export interface ReleaseMetadata {
  version: string
  versionCode: number
  releaseNotes: string
  minimumSupportedVersionCode: number
  apkUrl: string
  sha256: string
  publishedAt: string
  fileSizeBytes?: number
}

export const CURRENT_APP_INFO = {
  versionName: '1.1.0',
  versionCode: 2,
  packageId: 'com.studyflow.app',
  minSdk: 24,
  targetSdk: 34
}

/**
 * Fetch and check release metadata from the canonical update endpoint.
 */
export async function fetchLatestRelease(): Promise<{
  updateAvailable: boolean
  latest?: ReleaseMetadata
  current: typeof CURRENT_APP_INFO
  error?: string
}> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    const res = await fetch(`/release-metadata.json?_t=${Date.now()}`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      return {
        updateAvailable: false,
        current: CURRENT_APP_INFO,
        error: `Server returned HTTP ${res.status}: ${res.statusText}`
      }
    }

    const data: ReleaseMetadata = await res.json()

    // Validate schema
    if (!data.version || typeof data.versionCode !== 'number' || !data.apkUrl) {
      return {
        updateAvailable: false,
        current: CURRENT_APP_INFO,
        error: 'Invalid release metadata schema received from update server.'
      }
    }

    const updateAvailable = data.versionCode > CURRENT_APP_INFO.versionCode

    return {
      updateAvailable,
      latest: data,
      current: CURRENT_APP_INFO
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      updateAvailable: false,
      current: CURRENT_APP_INFO,
      error: `Could not check for updates: ${msg}`
    }
  }
}

/**
 * Download APK binary, verify SHA-256 checksum client-side, and return a validated object URL.
 */
export async function downloadAndVerifyApk(
  apkUrl: string,
  expectedSha256: string,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; blobUrl?: string; error?: string; sha256?: string; bytes?: number }> {
  try {
    const response = await fetch(apkUrl)
    if (!response.ok) {
      throw new Error(`Failed to download APK: HTTP ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    const total = contentLength ? parseInt(contentLength, 10) : 0

    if (!response.body) {
      const buffer = await response.arrayBuffer()
      return await verifyBuffer(buffer, expectedSha256)
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        received += value.length
        if (total > 0 && onProgress) {
          onProgress(Math.min(100, Math.round((received / total) * 100)))
        }
      }
    }

    const allBytes = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      allBytes.set(chunk, offset)
      offset += chunk.length
    }

    return await verifyBuffer(allBytes.buffer, expectedSha256)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Download failed: ${msg}`
    }
  }
}

async function verifyBuffer(
  buffer: ArrayBuffer,
  expectedSha256: string
): Promise<{ success: boolean; blobUrl?: string; error?: string; sha256?: string; bytes?: number }> {
  // Check non-empty
  if (buffer.byteLength < 1000000) {
    return {
      success: false,
      error: `Downloaded package is smaller than 1 MB (${buffer.byteLength} bytes). Corrupt download.`
    }
  }

  // Calculate SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const calculatedSha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  if (expectedSha256 && calculatedSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    return {
      success: false,
      error: `SHA-256 verification failed! Expected ${expectedSha256.slice(0, 12)}… but computed ${calculatedSha256.slice(0, 12)}…`
    }
  }

  const blob = new Blob([buffer], { type: 'application/vnd.android.package-archive' })
  const blobUrl = URL.createObjectURL(blob)

  return {
    success: true,
    blobUrl,
    sha256: calculatedSha256,
    bytes: buffer.byteLength
  }
}
