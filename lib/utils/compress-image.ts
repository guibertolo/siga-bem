/**
 * Client-side image compression utility.
 * Story 2.2 — Upload de Fotos de Comprovantes (AC3)
 *
 * Compresses images to <= maxKB using Canvas API.
 * PDFs are NOT compressed — they pass through as-is.
 * Maintains aspect ratio; max dimension 1200px.
 */

const MAX_DIMENSION = 1200
const INITIAL_QUALITY = 0.7
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

/**
 * Compress an image file to target size using Canvas API.
 * Iteratively reduces JPEG quality until target is reached.
 *
 * @param file - The image File to compress
 * @param maxKB - Maximum output size in KB (default 200)
 * @returns Compressed Blob (always JPEG output for images)
 */
export function compressImage(
  file: File,
  maxKB: number = DEFAULT_MAX_KB,
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

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Scale down if exceeds max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width / height) * MAX_DIMENSION)
          height = MAX_DIMENSION
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

      let quality = INITIAL_QUALITY

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
          'image/jpeg',
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
