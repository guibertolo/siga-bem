'use client'

import { useEffect, useState } from 'react'
import { listComprovantes } from '@/app/(dashboard)/gastos/comprovante-actions'
import type { FotoComprovanteWithUrl } from '@/types/foto-comprovante'

interface ReceiptModalProps {
  gastoId: string
  onClose: () => void
}

export function ReceiptModal({ gastoId, onClose }: ReceiptModalProps) {
  const [comprovantes, setComprovantes] = useState<FotoComprovanteWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const result = await listComprovantes(gastoId)
      if (cancelled) return

      if (result.success && result.data) {
        setComprovantes(result.data)
      } else {
        setError(result.error ?? 'Erro ao carregar comprovantes')
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [gastoId])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && activeIndex > 0) setActiveIndex((i) => i - 1)
      if (e.key === 'ArrowRight' && activeIndex < comprovantes.length - 1) setActiveIndex((i) => i + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, activeIndex, comprovantes.length])

  const activeComprovante = comprovantes[activeIndex]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar comprovante"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40"
        aria-label="Fechar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div
        className="flex max-h-[90vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="flex items-center gap-2 text-white">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Carregando...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && comprovantes.length === 0 && !error && (
          <div className="text-white">Nenhum comprovante encontrado.</div>
        )}

        {activeComprovante && (
          <>
            {activeComprovante.content_type?.startsWith('image/') ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeComprovante.url}
                alt="Comprovante"
                className="max-h-[80vh] max-w-[85vw] rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card p-8">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="text-sm text-text-muted">Documento PDF</p>
                <a
                  href={activeComprovante.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-btn-primary-hover"
                >
                  Abrir PDF
                </a>
              </div>
            )}

            {/* Navigation for multiple comprovantes */}
            {comprovantes.length > 1 && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                  className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 disabled:opacity-30"
                  aria-label="Anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="text-sm text-white">
                  {activeIndex + 1} / {comprovantes.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => Math.min(comprovantes.length - 1, i + 1))}
                  disabled={activeIndex === comprovantes.length - 1}
                  className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/40 disabled:opacity-30"
                  aria-label="Proximo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
