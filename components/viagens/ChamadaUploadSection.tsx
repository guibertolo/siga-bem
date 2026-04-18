'use client'

import { useState, useRef, useCallback } from 'react'
import { compressImage } from '@/lib/utils/compress-image'
import { uploadChamada } from '@/app/(dashboard)/viagens/chamada-actions'

type UploadState = 'idle' | 'previewing' | 'uploading' | 'done' | 'error'

interface ChamadaUploadSectionProps {
  /** When set, uploads immediately on confirm. When null, holds blob for later. */
  viagemId?: string | null
  /** Called when a photo is captured and confirmed (for create mode, before viagem exists). */
  onBlobReady?: (blob: Blob) => void
  /** Whether the current user is a motorista (hides "Trocar foto" if true and already uploaded). */
  isMotorista?: boolean
}

const MAX_KB = 400
const CHAMADA_ACCEPT = 'image/jpeg,image/png,image/webp'

export function ChamadaUploadSection({
  viagemId,
  onBlobReady,
  isMotorista: _isMotorista = false,
}: ChamadaUploadSectionProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelected = useCallback(async (file: File) => {
    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Use apenas fotos (JPG, PNG ou WebP).')
      setState('error')
      return
    }

    // Validate size (pre-compression check, 10MB max input)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('A foto esta muito grande. Tente tirar com menos zoom ou escolha outra.')
      setState('error')
      return
    }

    setErrorMsg(null)
    setProgress('Preparando foto...')

    try {
      const blob = await compressImage(file, MAX_KB, 'image/webp')
      setCompressedBlob(blob)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setState('previewing')
      setProgress(null)
    } catch {
      setErrorMsg('Nao conseguimos processar a foto. Tente novamente.')
      setState('error')
      setProgress(null)
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelected(file)
      }
      // Reset input so the same file can be re-selected
      e.target.value = ''
    },
    [handleFileSelected],
  )

  const handleConfirm = useCallback(async () => {
    if (!compressedBlob) return

    // If no viagemId, just pass blob up for later upload
    if (!viagemId) {
      onBlobReady?.(compressedBlob)
      setState('done')
      setProgress(null)
      return
    }

    // Upload immediately
    setState('uploading')
    setProgress('Enviando foto...')
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', compressedBlob, 'chamada.webp')
      formData.append('viagemId', viagemId)
      formData.append('contentType', 'image/webp')

      const result = await uploadChamada(formData)

      if (result.success) {
        setState('done')
        setProgress(null)
      } else {
        setErrorMsg(result.error ?? 'Nao conseguimos enviar a foto. Verifique a conexao e tente novamente.')
        setState('error')
        setProgress(null)
      }
    } catch {
      setErrorMsg('Nao conseguimos enviar a foto. Verifique a conexao e tente novamente.')
      setState('error')
      setProgress(null)
    }
  }, [compressedBlob, viagemId, onBlobReady])

  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setCompressedBlob(null)
    setErrorMsg(null)
    setProgress(null)
    setState('idle')
  }, [previewUrl])

  // Done state -- show success message
  if (state === 'done') {
    return (
      <div className="rounded-lg border border-success/20 bg-alert-success-bg p-4">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 text-success flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-base font-medium text-success">Foto da chamada enviada</p>
        </div>
      </div>
    )
  }

  // Preview state
  if (state === 'previewing' || state === 'uploading') {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-4 space-y-4">
        <p className="text-base font-medium text-primary-900">Foto da chamada</p>

        {previewUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview da chamada"
              className="rounded-lg border border-surface-border object-contain"
              style={{ maxHeight: '300px', minHeight: '200px' }}
            />
          </div>
        )}

        {progress && (
          <div className="flex items-center justify-center gap-2 text-sm text-primary-500">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {progress}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state === 'uploading'}
            className="w-full rounded-lg bg-success px-6 py-4 text-base font-bold text-white transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: '56px' }}
          >
            {state === 'uploading' ? 'Enviando...' : 'Usar esta foto'}
          </button>
          <button
            type="button"
            onClick={handleRetake}
            disabled={state === 'uploading'}
            className="w-full rounded-lg bg-surface-muted px-6 py-4 text-base font-medium text-primary-700 transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            style={{ minHeight: '56px' }}
          >
            Tirar de novo
          </button>
        </div>
      </div>
    )
  }

  // Idle/Error state -- show capture buttons
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4 space-y-3">
      <p className="text-base font-medium text-primary-900">Foto da chamada</p>
      <p className="text-sm text-primary-500">
        Tire uma foto do documento com os carros e o valor do frete.
      </p>

      {errorMsg && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-3 text-sm text-danger">
          {errorMsg}
        </div>
      )}

      {progress && (
        <div className="flex items-center gap-2 text-sm text-primary-500">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {progress}
        </div>
      )}

      {/* Main button: camera capture (mobile) / file picker (desktop) */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-btn-primary px-6 text-base font-bold text-white transition-colors hover:bg-btn-primary-hover"
        style={{ minHeight: '64px' }}
      >
        <svg className="h-7 w-7 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Tirar foto da chamada
      </button>

      {/* Hidden file input with capture="environment" for mobile camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={CHAMADA_ACCEPT}
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Capturar foto da chamada"
      />

      {/* Secondary button: gallery picker */}
      <button
        type="button"
        onClick={() => galleryInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-muted px-6 text-base font-medium text-primary-700 transition-colors hover:bg-surface-hover"
        style={{ minHeight: '56px' }}
      >
        Ja tenho a foto salva no celular
      </button>

      {/* Hidden file input WITHOUT capture for gallery access */}
      <input
        ref={galleryInputRef}
        type="file"
        accept={CHAMADA_ACCEPT}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Selecionar foto da galeria"
      />
    </div>
  )
}
