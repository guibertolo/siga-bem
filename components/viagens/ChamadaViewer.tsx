'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface ChamadaViewerProps {
  url: string
  viagemId: string
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const DESKTOP_STEP = 0.25

/**
 * Fullscreen image viewer with pinch-to-zoom (mobile) and +/- buttons (desktop).
 * Uses style inline for position:fixed fullscreen per feedback_fullscreen_elements.
 * NOT a modal/popup -- this is navigation (image viewing), per feedback_no_popups.
 */
export function ChamadaViewer({ url, viagemId, onClose }: ChamadaViewerProps) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLDivElement>(null)

  // Touch state for pinch-to-zoom
  const touchState = useRef<{
    initialDistance: number
    initialScale: number
    lastTap: number
  }>({
    initialDistance: 0,
    initialScale: 1,
    lastTap: 0,
  })

  // Pan state
  const panState = useRef<{
    isPanning: boolean
    startX: number
    startY: number
    startTranslateX: number
    startTranslateY: number
  }>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
  })

  const clampScale = useCallback((s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)), [])

  // Escape key closes viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        touchState.current.initialDistance = Math.hypot(dx, dy)
        touchState.current.initialScale = scale
      } else if (e.touches.length === 1) {
        // Double-tap detection
        const now = Date.now()
        if (now - touchState.current.lastTap < 300) {
          // Double-tap: reset to 1x
          setScale(1)
          setTranslate({ x: 0, y: 0 })
        }
        touchState.current.lastTap = now

        // Pan start (only when zoomed)
        if (scale > 1) {
          panState.current.isPanning = true
          panState.current.startX = e.touches[0].clientX
          panState.current.startY = e.touches[0].clientY
          panState.current.startTranslateX = translate.x
          panState.current.startTranslateY = translate.y
        }
      }
    },
    [scale, translate],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch move
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const currentDistance = Math.hypot(dx, dy)
        const ratio = currentDistance / touchState.current.initialDistance
        const newScale = clampScale(touchState.current.initialScale * ratio)
        setScale(newScale)
        if (newScale <= 1) {
          setTranslate({ x: 0, y: 0 })
        }
        e.preventDefault()
      } else if (e.touches.length === 1 && panState.current.isPanning && scale > 1) {
        // Pan move
        const dx = e.touches[0].clientX - panState.current.startX
        const dy = e.touches[0].clientY - panState.current.startY
        setTranslate({
          x: panState.current.startTranslateX + dx,
          y: panState.current.startTranslateY + dy,
        })
        e.preventDefault()
      }
    },
    [clampScale, scale],
  )

  const handleTouchEnd = useCallback(() => {
    panState.current.isPanning = false
  }, [])

  const handleZoomIn = useCallback(() => {
    setScale((s) => clampScale(s + DESKTOP_STEP))
  }, [clampScale])

  const handleZoomOut = useCallback(() => {
    const newScale = clampScale(scale - DESKTOP_STEP)
    setScale(newScale)
    if (newScale <= 1) {
      setTranslate({ x: 0, y: 0 })
    }
  }, [clampScale, scale])

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `chamada-${viagemId}.webp`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in same tab
      window.location.href = url
    }
  }, [url, viagemId])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="dialog"
      aria-label="Visualizar foto da chamada"
      onClick={handleBackdropClick}
    >
      {/* Top bar: close + download + zoom controls */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ flexShrink: 0 }}
      >
        {/* Close button - 48px min, with text for 55+ audience */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 text-base font-medium text-white transition-colors hover:bg-white/20"
          style={{ minHeight: '48px', minWidth: '48px' }}
          aria-label="Fechar visualizacao"
        >
          <svg className="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="hidden sm:inline">Fechar</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Zoom controls for desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
              className="flex items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
              style={{ minHeight: '48px', minWidth: '48px' }}
              aria-label="Diminuir zoom"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="min-w-[3rem] text-center text-sm text-white/80 tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
              className="flex items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
              style={{ minHeight: '48px', minWidth: '48px' }}
              aria-label="Aumentar zoom"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 text-base font-medium text-white transition-colors hover:bg-white/20"
            style={{ minHeight: '48px', minWidth: '48px' }}
            aria-label="Baixar foto"
          >
            <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Baixar</span>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={imgRef}
        className="flex flex-1 items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Foto da chamada"
          className="max-h-full max-w-full object-contain select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: scale === 1 ? 'transform 0.2s ease-out' : undefined,
          }}
          draggable={false}
        />
      </div>

      {/* Mobile zoom hint */}
      <div className="sm:hidden pb-4 text-center text-xs text-white/50">
        Aperte com dois dedos para ampliar. Toque duas vezes para resetar.
      </div>
    </div>
  )
}
