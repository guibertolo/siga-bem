'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

/** Module-level cache: loaded once per session, shared across all instances. */
let cidadesIBGECache: string[] | null = null;
let cidadesIBGEPromise: Promise<string[]> | null = null;

/**
 * Lazily fetch and cache the full IBGE cities list.
 * Returns from cache if already loaded.
 */
function loadCidadesIBGE(): Promise<string[]> {
  if (cidadesIBGECache) return Promise.resolve(cidadesIBGECache);
  if (cidadesIBGEPromise) return cidadesIBGEPromise;

  cidadesIBGEPromise = fetch('/data/cidades-brasil.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load cities: ${res.status}`);
      return res.json() as Promise<string[]>;
    })
    .then((data) => {
      cidadesIBGECache = data;
      return data;
    })
    .catch((err) => {
      // Reset promise so next attempt can retry
      cidadesIBGEPromise = null;
      console.error('CidadeAutocomplete: failed to load IBGE cities', err);
      return [] as string[];
    });

  return cidadesIBGEPromise;
}

interface CidadeAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Previously used cities (from viagens) -- shown with priority */
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  hasError?: boolean;
}

/**
 * Autocomplete input for Brazilian city names.
 * Merges full IBGE database (~5570 cities) with previously used cities.
 * Used cities appear first with a "Usado" badge.
 * Filters after 2+ chars typed (case-insensitive, accent-insensitive).
 * 48px touch targets, zero English.
 */
export function CidadeAutocomplete({
  id,
  value,
  onChange,
  suggestions,
  placeholder = 'Ex: Sao Paulo, SP',
  disabled = false,
  maxLength = 200,
  className,
  hasError = false,
}: CidadeAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [allCidades, setAllCidades] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Build the used-cities Set for O(1) lookup
  const usedCidadesSet = useRef(new Set<string>());
  useEffect(() => {
    usedCidadesSet.current = new Set(suggestions.map((s) => s.trim()));
  }, [suggestions]);

  // Lazy-load IBGE cities on first focus
  const loadTriggered = useRef(false);
  const triggerLoad = useCallback(() => {
    if (loadTriggered.current) return;
    loadTriggered.current = true;
    loadCidadesIBGE().then((ibgeCidades) => {
      // Merge: IBGE list is the base, used cities are already included
      // (all cities in suggestions should be in IBGE, but add any extras just in case)
      const ibgeSet = new Set(ibgeCidades);
      const extras = suggestions.filter((s) => !ibgeSet.has(s.trim()));
      const merged = [...extras, ...ibgeCidades];
      setAllCidades(merged);
    });
  }, [suggestions]);

  // Normalize for accent-insensitive matching
  const normalize = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Filter logic: min 2 chars, max 10 results, used cities first
  const query = value.trim();
  const normalizedQuery = normalize(query);

  let filtered: Array<{ city: string; isUsed: boolean }> = [];

  if (query.length >= 2 && allCidades.length > 0) {
    const usedMatches: Array<{ city: string; isUsed: boolean }> = [];
    const otherMatches: Array<{ city: string; isUsed: boolean }> = [];

    for (const city of allCidades) {
      if (!normalize(city).includes(normalizedQuery)) continue;

      const isUsed = usedCidadesSet.current.has(city);
      if (isUsed) {
        usedMatches.push({ city, isUsed: true });
      } else {
        otherMatches.push({ city, isUsed: false });
      }

      // Stop early once we have enough
      if (usedMatches.length + otherMatches.length >= 50) break;
    }

    // Used cities first, then others, capped at 10
    filtered = [...usedMatches, ...otherMatches].slice(0, 10);
  }

  const showDropdown = isOpen && filtered.length > 0;

  const handleSelect = useCallback(
    (city: string) => {
      onChange(city);
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange],
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[focusedIndex].city);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  }

  /**
   * Highlight the matching substring in bold.
   */
  function renderHighlighted(text: string) {
    if (!query) return text;

    const normalizedText = normalize(text);
    const idx = normalizedText.indexOf(normalizedQuery);

    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);

    return (
      <>
        {before}
        <strong className="font-bold">{match}</strong>
        {after}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setFocusedIndex(-1);
        }}
        onFocus={() => {
          triggerLoad();
          if (query.length >= 2) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-activedescendant={
          focusedIndex >= 0 && id ? `${id}-option-${focusedIndex}` : undefined
        }
        className={cn(
          'block w-full rounded-lg border px-4 py-3 text-base transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          hasError
            ? 'border-danger/30 bg-alert-danger-bg'
            : 'border-surface-border bg-surface-card',
          disabled && 'bg-surface-muted text-text-muted cursor-not-allowed',
          className,
        )}
      />

      {showDropdown && (
        <ul
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-[384px] overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-lg"
        >
          {filtered.map((item, i) => (
            <li
              key={item.city}
              id={id ? `${id}-option-${i}` : undefined}
              role="option"
              aria-selected={i === focusedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item.city);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={cn(
                'cursor-pointer px-4 py-3 text-base text-primary-900 min-h-[48px] flex items-center gap-2',
                i === focusedIndex && 'bg-surface-hover',
              )}
            >
              <span className="flex-1">{renderHighlighted(item.city)}</span>
              {item.isUsed && (
                <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 shrink-0">
                  Usado
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
