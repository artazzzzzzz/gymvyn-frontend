import { useCallback, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const DEFAULT_MAX_EDGE_PX = 1280
const DEFAULT_QUALITY     = 90   // 0-100; canvas expects 0.0-1.0 (divided below)

async function resizeImageClient(file, maxEdgePx, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, maxEdgePx / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        quality / 100,
      )
    }
    img.onerror = reject
    img.src = url
  })
}

// Single-photo picker hook used by avatar / logo / image-upload flows.
// For the 3-photo food picker (diet/camera tab) see useFoodPhotoPicker.js —
// that hook is kept separate and must not be modified.
//
// Returns: { photo: { file, blob, preview } | null, pickPhoto, clearPhoto }
//   file    — original File object (use .size for pre-upload validation)
//   blob    — client-side resized JPEG Blob (append to FormData for upload)
//   preview — blob: ObjectURL safe for <img src>; revoked automatically on clearPhoto
//
// Options (all optional):
//   source    — CameraSource.Prompt (default) shows the OS "Take Photo / Library" sheet
//               on native; CameraSource.Camera or CameraSource.Photos for a specific source.
//   maxEdgePx — longest edge after client-side resize (default 1280)
//   quality   — JPEG quality 0-100 (default 90)
export function usePhotoPicker({
  source    = CameraSource.Prompt,
  maxEdgePx = DEFAULT_MAX_EDGE_PX,
  quality   = DEFAULT_QUALITY,
} = {}) {
  const [photo, setPhoto] = useState(null)
  const inputRef = useRef(null)

  const processFile = useCallback(async (file) => {
    if (!file) return
    try {
      const blob    = await resizeImageClient(file, maxEdgePx, quality)
      const preview = URL.createObjectURL(blob)
      setPhoto(prev => {
        if (prev?.preview) URL.revokeObjectURL(prev.preview)
        return { file, blob, preview }
      })
    } catch {
      // Resize failure (unsupported format, canvas error) — silently skip
    }
  }, [maxEdgePx, quality])

  const pickPhotoNative = useCallback(async () => {
    try {
      const result = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source,
        quality,
      })
      const blob = await (await fetch(result.webPath)).blob()
      const file = new File(
        [blob],
        `photo.${result.format || 'jpeg'}`,
        { type: blob.type || 'image/jpeg' },
      )
      await processFile(file)
    } catch {
      // User cancelled the picker, or camera/library unavailable — no-op
    }
  }, [source, quality, processFile])

  const handleWebInput = useCallback((e) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }, [processFile])

  const pickPhoto = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      pickPhotoNative()
      return
    }
    // Web fallback: hidden <input type="file"> without a `capture` attribute
    // so the browser lets the user choose from both camera and photo library,
    // matching CameraSource.Prompt semantics on native.
    if (!inputRef.current) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.style.display = 'none'
      input.onchange = handleWebInput
      document.body.appendChild(input)
      inputRef.current = input
    }
    inputRef.current.value = ''
    inputRef.current.click()
  }, [pickPhotoNative, handleWebInput])

  const clearPhoto = useCallback(() => {
    setPhoto(prev => {
      if (prev?.preview) URL.revokeObjectURL(prev.preview)
      return null
    })
  }, [])

  return { photo, pickPhoto, clearPhoto }
}
