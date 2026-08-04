/** Canvas-side image helpers. All processing stays on-device. */

export const MAX_EXPORT_SIDE = 1500
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024
export const MAX_EXPORT_BYTES = 4.5 * 1024 * 1024

export class UploadError extends Error {}

/**
 * Decode a file and normalize it to at most MAX_EXPORT_SIDE on the longest
 * side. Downscaling happens here, before any encoding, because the Mode 1
 * checkerboard must never be resampled afterwards.
 */
export async function fileToImageData(file: File): Promise<ImageData> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('This file is over 40MB — pick a smaller one')
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new UploadError("Couldn't read that file — choose a JPG, PNG or WebP")
  }
  try {
    const scale = Math.min(1, MAX_EXPORT_SIDE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, w, h)
    return ctx.getImageData(0, 0, w, h)
  } finally {
    bitmap.close()
  }
}

export function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = data.width
  canvas.height = data.height
  canvas.getContext('2d')!.putImageData(data, 0, 0)
  return canvas
}

/**
 * Composite an encoded (transparent) image on a solid background, optionally
 * simulating X's preview pipeline (downscale + slight blur ≈ JPEG mush).
 */
export function compositePreview(
  encoded: ImageData,
  background: string,
  simulateCompression: boolean,
): HTMLCanvasElement {
  const src = imageDataToCanvas(encoded)
  const out = document.createElement('canvas')
  out.width = encoded.width
  out.height = encoded.height
  const ctx = out.getContext('2d')!
  ctx.fillStyle = background
  ctx.fillRect(0, 0, out.width, out.height)
  if (simulateCompression) {
    // X's timeline serves a downscaled JPEG: emulate with a 0.5x round-trip.
    const tmp = document.createElement('canvas')
    tmp.width = Math.max(1, Math.round(encoded.width / 2))
    tmp.height = Math.max(1, Math.round(encoded.height / 2))
    const tctx = tmp.getContext('2d')!
    tctx.fillStyle = background
    tctx.fillRect(0, 0, tmp.width, tmp.height)
    tctx.drawImage(src, 0, 0, tmp.width, tmp.height)
    ctx.imageSmoothingEnabled = true
    ctx.filter = 'blur(0.4px)'
    ctx.drawImage(tmp, 0, 0, out.width, out.height)
    ctx.filter = 'none'
  } else {
    ctx.drawImage(src, 0, 0)
  }
  return out
}

/** Crop/scale an ImageData to a target aspect via cover-fit with offsets. */
export function coverFit(
  source: ImageData,
  targetW: number,
  targetH: number,
  offsetX = 0.5, // 0..1, which part of the overflow to keep
  offsetY = 0.5,
  zoom = 1,
): ImageData {
  const src = imageDataToCanvas(source)
  const out = document.createElement('canvas')
  out.width = targetW
  out.height = targetH
  const ctx = out.getContext('2d')!
  const scale = Math.max(targetW / source.width, targetH / source.height) * zoom
  const drawW = source.width * scale
  const drawH = source.height * scale
  const x = (targetW - drawW) * offsetX
  const y = (targetH - drawH) * offsetY
  ctx.drawImage(src, x, y, drawW, drawH)
  return ctx.getImageData(0, 0, targetW, targetH)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
