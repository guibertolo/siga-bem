'use client';

import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  text: string;
}

/**
 * Info icon (ⓘ) with hover/click tooltip.
 * Shows a brief explanation when user hovers or taps.
 * Designed for 55+ audience: large touch target, readable text.
 */
export function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-primary-500/30 text-primary-500 text-xs font-bold hover:bg-primary-500/10 transition-colors cursor-help"
        aria-label="Mais informações"
      >
        i
      </button>

      {open && (
        <div
          className="absolute left-8 top-1/2 -translate-y-1/2 bg-surface-card border border-surface-border rounded-lg shadow-lg p-3 text-sm text-primary-700 leading-relaxed"
          style={{ zIndex: 9999, width: '280px', maxWidth: '80vw' }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
