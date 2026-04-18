'use client'

import { useState, useCallback } from 'react'
import { ChamadaViewer } from '@/components/viagens/ChamadaViewer'
import { ChamadaUploadSection } from '@/components/viagens/ChamadaUploadSection'
import type { FotoChamadaWithUrl } from '@/types/foto-chamada'

interface ChamadaMiniaturaProps {
  chamadas: FotoChamadaWithUrl[]
  viagemId: string
  viagemStatus: 'planejada' | 'em_andamento' | 'concluida' | 'cancelada'
  usuarioRole: string
}

/**
 * Chamada thumbnail + zero-state for the viagem detail page.
 * AC 1: 80x80px clickable thumbnail
 * AC 3/4: "Substituir chamada" only for dono/admin
 * AC 5: "+N foto anterior" label
 * AC 6: contextual zero-state
 */
export function ChamadaMiniatura({
  chamadas,
  viagemId,
  viagemStatus,
  usuarioRole,
}: ChamadaMiniaturaProps) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const isDono = usuarioRole === 'dono' || usuarioRole === 'admin'
  const isMotorista = usuarioRole === 'motorista'
  const hasChamadas = chamadas.length > 0
  const principal = chamadas[0] ?? null
  const previousCount = chamadas.length - 1

  const handleOpenViewer = useCallback((url: string) => {
    setViewerUrl(url)
  }, [])

  const handleCloseViewer = useCallback(() => {
    setViewerUrl(null)
  }, [])

  const handleToggleUpload = useCallback(() => {
    setShowUpload((v) => !v)
  }, [])

  // AC 6: Zero-state
  if (!hasChamadas) {
    // Motorista + viagem em andamento: card with CTA
    if (isMotorista && (viagemStatus === 'em_andamento' || viagemStatus === 'planejada')) {
      return (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Chamada</p>
          <div className="rounded-lg border border-warning/30 bg-alert-warning-bg p-4">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-6 w-6 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-base font-medium text-primary-900">Chamada pendente</p>
            </div>
            <ChamadaUploadSection viagemId={viagemId} isMotorista />
          </div>
        </div>
      )
    }

    // Dono/admin: card with upload CTA
    if (isDono) {
      return (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Chamada</p>
          {showUpload ? (
            <ChamadaUploadSection viagemId={viagemId} />
          ) : (
            <div className="rounded-lg border border-surface-border bg-surface-card p-4">
              <p className="text-sm text-primary-500 mb-3">Chamada nao enviada</p>
              <button
                type="button"
                onClick={handleToggleUpload}
                className="flex items-center gap-2 rounded-lg bg-btn-primary px-4 text-sm font-medium text-white transition-colors hover:bg-btn-primary-hover"
                style={{ minHeight: '48px' }}
              >
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar chamada
              </button>
            </div>
          )}
        </div>
      )
    }

    // Viagem concluida sem chamada: text only, no CTA
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Chamada</p>
        <div className="rounded-lg border border-surface-border bg-surface-card p-4">
          <p className="text-sm text-primary-500">Chamada nao registrada</p>
        </div>
      </div>
    )
  }

  // Has chamadas -- show thumbnail
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-primary-500">Chamada</p>

      <div className="flex items-start gap-4">
        {/* 80x80 clickable thumbnail */}
        <button
          type="button"
          onClick={() => handleOpenViewer(principal.url)}
          className="flex-shrink-0 overflow-hidden rounded-lg border border-surface-border transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ width: '80px', height: '80px' }}
          aria-label="Ver foto da chamada em tela cheia"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={principal.url}
            alt="Foto da chamada"
            className="h-full w-full object-cover"
            style={{ width: '80px', height: '80px' }}
          />
        </button>

        <div className="flex flex-col gap-2">
          {/* AC 5: +N foto anterior */}
          {previousCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllPhotos((v) => !v)}
              className="text-sm text-primary-500 hover:text-primary-700 text-left transition-colors"
            >
              +{previousCount} foto{previousCount > 1 ? 's' : ''} anterior{previousCount > 1 ? 'es' : ''}
            </button>
          )}

          {/* AC 3: Substituir chamada - dono/admin only */}
          {isDono && !showUpload && (
            <button
              type="button"
              onClick={handleToggleUpload}
              className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-hover"
              style={{ minHeight: '40px' }}
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Substituir chamada
            </button>
          )}
        </div>
      </div>

      {/* Upload section for replacement (dono/admin only) */}
      {isDono && showUpload && (
        <div className="mt-2">
          <ChamadaUploadSection viagemId={viagemId} />
        </div>
      )}

      {/* AC 5: All photos list */}
      {showAllPhotos && previousCount > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {chamadas.slice(1).map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleOpenViewer(ch.url)}
              className="overflow-hidden rounded-lg border border-surface-border transition-shadow hover:shadow-md"
              style={{ width: '60px', height: '60px' }}
              aria-label={`Ver foto anterior de ${new Date(ch.uploaded_at).toLocaleDateString('pt-BR')}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ch.url}
                alt={`Chamada anterior - ${new Date(ch.uploaded_at).toLocaleDateString('pt-BR')}`}
                className="h-full w-full object-cover"
                style={{ width: '60px', height: '60px' }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen viewer */}
      {viewerUrl && (
        <ChamadaViewer
          url={viewerUrl}
          viagemId={viagemId}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  )
}
