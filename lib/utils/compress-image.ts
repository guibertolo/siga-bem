/**
 * Client-side image compression utility.
 * Story 2.2 — Upload de Fotos de Comprovantes (AC3)
 * Story 23.2 — Upload de Chamada com outputType WebP
 *
 * Compresses images to <= maxKB using Canvas API.
 * PDFs are NOT compressed — they pass through as-is.
 * Maintains aspect ratio; max dimension configurable per outputType.
 */

const MAX_DIMENSION_JPEG = 1200
const MAX_DIMENSION_WEBP = 1600
const INITIAL_QUALITY_JPEG = 0.7
const INITIAL_QUALITY_WEBP = 0.8
const MIN_QUALITY = 0.1
const QUALITY_STEP = 0.1
const DEFAULT_MAX_KB = 200

/** MIME types that should be compressed (images only). */
const COMPRESSIBLE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

/** All accepted file types for upload. */
export const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

/** Accept string for file input element. */
export const ACCEPT_STRING = 'image/jpeg,image/png,image/webp,application/pdf'

/** Max file size for input (10MB per NFR-002). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Check if a file type is a compressible image.
 */
export function isCompressibleImage(type: string): boolean {
  return COMPRESSIBLE_TYPES.has(type)
}

/**
 * Validate file type against accepted formats.
 * Returns error message or null if valid.
 */
export function validateFileType(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Formato nao suportado. Use JPG, PNG, WebP ou PDF.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Arquivo muito grande. Maximo 10MB.'
  }
  return null
}

/** Supported output types for compression. */
export type CompressOutputType = 'image/jpeg' | 'image/webp'

/**
 * Compress an image file to target size using Canvas API.
 * Iteratively reduces quality until target is reached.
 *
 * @param file - The image File to compress
 * @param maxKB - Maximum output size in KB (default 200)
 * @param outputType - Output MIME type (default 'image/jpeg' for backward compat)
 * @returns Compressed Blob in the specified output format
 */
export function compressImage(
  file: File,
  maxKB: number = DEFAULT_MAX_KB,
  outputType: CompressOutputType = 'image/jpeg',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!isCompressibleImage(file.type)) {
      // Not an image — return as-is (e.g., PDF)
      resolve(file)
      return
    }

    // If already under limit, return as-is
    if (file.size <= maxKB * 1024) {
      resolve(file)
      return
    }

    const isWebP = outputType === 'image/webp'
    const maxDim = isWebP ? MAX_DIMENSION_WEBP : MAX_DIMENSION_JPEG
    const initialQuality = isWebP ? INITIAL_QUALITY_WEBP : INITIAL_QUALITY_JPEG

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Scale down if exceeds max dimension
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim)
          width = maxDim
        } else {
          width = Math.round((width / height) * maxDim)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas 2D context not available'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      let quality = initialQuality

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              URL.revokeObjectURL(url)
              reject(new Error('Falha na compressao da imagem'))
              return
            }

            if (blob.size <= maxKB * 1024 || quality <= MIN_QUALITY) {
              URL.revokeObjectURL(url)
              resolve(blob)
            } else {
              quality -= QUALITY_STEP
              tryCompress()
            }
          },
          outputType,
          quality,
        )
      }

      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Erro ao carregar imagem para compressao'))
    }

    img.src = url
  })
}
