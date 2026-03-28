/**
 * Tests for compress-image utility (pure functions only).
 * Story 2.2 — Upload de Fotos de Comprovantes
 *
 * Note: compressImage() uses Canvas/Image browser APIs and requires
 * jsdom or browser environment. These tests cover the pure validation
 * functions that work in Node.
 */
import {
  isCompressibleImage,
  validateFileType,
  ACCEPTED_TYPES,
  ACCEPT_STRING,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/utils/compress-image'

describe('compress-image utility', () => {
  describe('isCompressibleImage', () => {
    it('returns true for JPEG', () => {
      expect(isCompressibleImage('image/jpeg')).toBe(true)
    })

    it('returns true for PNG', () => {
      expect(isCompressibleImage('image/png')).toBe(true)
    })

    it('returns true for WebP', () => {
      expect(isCompressibleImage('image/webp')).toBe(true)
    })

    it('returns false for PDF', () => {
      expect(isCompressibleImage('application/pdf')).toBe(false)
    })

    it('returns false for BMP', () => {
      expect(isCompressibleImage('image/bmp')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isCompressibleImage('')).toBe(false)
    })
  })

  describe('validateFileType', () => {
    function createMockFile(type: string, sizeBytes: number): File {
      const buffer = new ArrayBuffer(sizeBytes)
      return new File([buffer], 'test.file', { type })
    }

    it('accepts JPEG files', () => {
      const file = createMockFile('image/jpeg', 1024)
      expect(validateFileType(file)).toBeNull()
    })

    it('accepts PNG files', () => {
      const file = createMockFile('image/png', 1024)
      expect(validateFileType(file)).toBeNull()
    })

    it('accepts WebP files', () => {
      const file = createMockFile('image/webp', 1024)
      expect(validateFileType(file)).toBeNull()
    })

    it('accepts PDF files', () => {
      const file = createMockFile('application/pdf', 1024)
      expect(validateFileType(file)).toBeNull()
    })

    it('rejects BMP files with correct message', () => {
      const file = createMockFile('image/bmp', 1024)
      expect(validateFileType(file)).toBe(
        'Formato nao suportado. Use JPG, PNG, WebP ou PDF.',
      )
    })

    it('rejects GIF files', () => {
      const file = createMockFile('image/gif', 1024)
      expect(validateFileType(file)).toContain('Formato nao suportado')
    })

    it('rejects files larger than 10MB', () => {
      const file = createMockFile('image/jpeg', 11 * 1024 * 1024)
      expect(validateFileType(file)).toBe('Arquivo muito grande. Maximo 10MB.')
    })

    it('accepts files exactly at 10MB', () => {
      const file = createMockFile('image/jpeg', MAX_FILE_SIZE_BYTES)
      expect(validateFileType(file)).toBeNull()
    })
  })

  describe('constants', () => {
    it('ACCEPTED_TYPES contains 4 types', () => {
      expect(ACCEPTED_TYPES.size).toBe(4)
      expect(ACCEPTED_TYPES.has('image/jpeg')).toBe(true)
      expect(ACCEPTED_TYPES.has('image/png')).toBe(true)
      expect(ACCEPTED_TYPES.has('image/webp')).toBe(true)
      expect(ACCEPTED_TYPES.has('application/pdf')).toBe(true)
    })

    it('ACCEPT_STRING includes all accepted MIME types', () => {
      expect(ACCEPT_STRING).toContain('image/jpeg')
      expect(ACCEPT_STRING).toContain('image/png')
      expect(ACCEPT_STRING).toContain('image/webp')
      expect(ACCEPT_STRING).toContain('application/pdf')
    })

    it('MAX_FILE_SIZE_BYTES is 10MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
    })
  })
})
