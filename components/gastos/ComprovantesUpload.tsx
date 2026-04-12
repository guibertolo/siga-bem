'use client'

import { useRef, useState, useCallback } from 'react'
import {
  compressImage,
  isCompressibleImage,
  validateFileType,
  ACCEPT_STRING,
} from '@/lib/utils/compress-image'
import {
  uploadComprovante,
  deleteComprovante,
} from '@/app/(dashboard)/gastos/comprovante-actions'
import type { FotoComprovanteWithUrl } from '@/types/foto-comprovante'
import { cn } from '@/lib/utils/cn'

interface ComprovantesUploadProps {
  gastoId: string
  empresaId: string
  comprovantes: FotoComprovanteWithUrl[]
  onComprovanteChange?: () => void
}

type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'success' | 'error'

export function ComprovantesUpload({
  gastoId,
  empresaId: _empresaId,
  comprovantes,
  onComprovanteChange,
}: ComprovantesUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const resetMessages = useCallback(() => {
    setErrorMessage(null)
    setSuccessMessage(null)
  }, [])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    resetMessages()
    setPreview(null)
    setPreviewType(null)

    // Validate file type
    const validationError = validateFileType(file)
    if (validationError) {
      setStatus('error')
      setErrorMessage(validationError)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Show preview
    if (isCompressibleImage(file.type)) {
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)
      setPreviewType('image')
    } else {
      setPreview(null)
      setPreviewType('pdf')
    }

    try {
      // Compress if image
      setStatus('compressing')
      setProgress(20)

      let processedFile: Blob = file
      let contentType = file.type

      if (isCompressibleImage(file.type)) {
        processedFile = await compressImage(file)
        contentType = 'image/jpeg' // Compression always outputs JPEG
      }

      setProgress(50)
      setStatus('uploading')

      // Build FormData for server action
      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('gastoId', gastoId)
      formData.append('contentType', contentType)

      setProgress(70)

      const result = await uploadComprovante(formData)

      if (result.success) {
        setStatus('success')
        setProgress(100)
        setSuccessMessage('Comprovante enviado com sucesso!')
        onComprovanteChange?.()
      } else {
        setStatus('error')
        setErrorMessage(result.error ?? 'Erro ao enviar comprovante')
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro inesperado no upload',
      )
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
      // Clear preview after upload
      if (preview) {
        URL.revokeObjectURL(preview)
        setPreview(null)
        setPreviewType(null)
      }
      // Reset after 3s
      setTimeout(() => {
        setStatus('idle')
        setProgress(0)
        resetMessages()
      }, 3000)
    }
  }

  async function handleDelete(comprovanteId: string) {
    setDeletingId(comprovanteId)
    setConfirmDeleteId(null)
    resetMessages()

    try {
      const result = await deleteComprovante(comprovanteId)
      if (result.success) {
        setSuccessMessage('Comprovante removido')
        onComprovanteChange?.()
      } else {
        setErrorMessage(result.error ?? 'Erro ao remover comprovante')
      }
    } catch {
      setErrorMessage('Erro ao remover comprovante')
    } finally {
      setDeletingId(null)
      setTimeout(resetMessages, 3000)
    }
  }

  const isProcessing = status === 'compressing' || status === 'uploading'

  return (
    <div className="space-y-4">
      <label className="mb-1 block text-sm font-medium text-primary-900">
        Comprovante
      </label>

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary-300 px-4 py-3 text-sm text-primary-500 transition-colors',
            'hover:border-primary-500 hover:bg-primary-100',
            isProcessing && 'pointer-events-none opacity-50',
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {isProcessing ? 'Enviando...' : 'Tirar Foto ou Selecionar Arquivo'}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            capture="environment"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
      </div>

      {/* Preview before upload */}
      {preview && previewType === 'image' && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview do comprovante"
            className="h-32 w-auto rounded-lg border border-surface-border object-cover"
          />
        </div>
      )}
      {previewType === 'pdf' && (
        <div className="mt-2 flex items-center gap-2 text-sm text-primary-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Documento PDF selecionado
        </div>
      )}

      {/* Progress bar */}
      {isProcessing && (
        <div className="w-full">
          <div className="mb-1 text-xs text-primary-500">
            {status === 'compressing' ? 'Comprimindo imagem...' : 'Enviando...'}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-success/20 bg-alert-success-bg p-3 text-sm text-success">
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      {/* Existing comprovantes list */}
      {comprovantes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary-500">
            Comprovantes ({comprovantes.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {comprovantes.map((comp) => (
              <div
                key={comp.id}
                className="group relative rounded-lg border border-surface-border p-1"
              >
                {comp.content_type?.startsWith('image/') ? (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(comp.url)}
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={comp.url}
                      alt="Comprovante"
                      className="h-20 w-20 rounded object-cover"
                    />
                  </button>
                ) : (
                  <a
                    href={comp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-20 w-20 items-center justify-center rounded bg-surface-muted"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-danger"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </a>
                )}

                {/* Delete button */}
                {confirmDeleteId === comp.id ? (
                  <div className="absolute -right-1 -top-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(comp.id)}
                      disabled={deletingId === comp.id}
                      className="rounded-full bg-danger p-1 text-white shadow-sm"
                      title="Confirmar exclusão"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-full bg-text-muted p-1 text-white shadow-sm"
                      title="Cancelar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(comp.id)}
                    className="absolute -right-1 -top-1 hidden rounded-full bg-danger p-1 text-white shadow-sm group-hover:block"
                    title="Remover comprovante"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizar comprovante"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Comprovante em tamanho completo"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
