'use client';

import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('frotaviva-theme') || localStorage.getItem('siga-bem-theme');
    if (saved === 'dark') {
      setIsDark(true);
    } else if (saved === 'light') {
      setIsDark(false);
    } else {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('frotaviva-theme', next ? 'dark' : 'light');

    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(next ? 'dark' : 'light');
  }

  if (!mounted) {
    return (
      <div className="inline-flex rounded-lg border border-surface-border bg-surface-muted p-1 min-h-[44px]">
        <span className="rounded-md px-3 py-1.5 text-sm w-[70px]" />
        <span className="rounded-md px-3 py-1.5 text-sm w-[70px]" />
      </div>
    );
  }

  return (
    <div
      className="inline-flex rounded-lg border border-surface-border bg-surface-muted p-1 min-h-[44px]"
      role="radiogroup"
      aria-label="Tema"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        onClick={() => isDark && toggle()}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          !isDark
            ? 'bg-surface-card text-primary-900 shadow-sm'
            : 'text-primary-500 hover:text-primary-700'
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="5" strokeWidth={2} />
          <path strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        Claro
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={() => !isDark && toggle()}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isDark
            ? 'bg-surface-card text-primary-900 shadow-sm'
            : 'text-primary-500 hover:text-primary-700'
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeWidth={2} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        Escuro
      </button>
    </div>
  );
}
