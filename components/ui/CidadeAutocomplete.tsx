'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface CidadeAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  hasError?: boolean;
}

/**
 * Autocomplete input for Brazilian city names.
 * Filters suggestions as user types (case-insensitive, accent-insensitive).
 * Click to select, or keep typing for custom value.
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normalize for accent-insensitive matching
  const normalize = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = value.trim().length > 0
    ? suggestions.filter((s) => normalize(s).includes(normalize(value))).slice(0, 50)
    : [];

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
      handleSelect(filtered[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  }

  /**
   * Highlight the matching substring in bold.
   */
  function renderHighlighted(text: string) {
    if (!value.trim()) return text;

    const normalizedText = normalize(text);
    const normalizedQuery = normalize(value);
    const idx = normalizedText.indexOf(normalizedQuery);

    if (idx === -1) return text;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + value.length);
    const after = text.slice(idx + value.length);

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
          if (value.trim().length > 0) {
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
            ? 'border-red-300 bg-alert-danger-bg'
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
          {filtered.map((city, i) => (
            <li
              key={city}
              id={id ? `${id}-option-${i}` : undefined}
              role="option"
              aria-selected={i === focusedIndex}
              onMouseDown={(e) => {
                // Prevent blur before select
                e.preventDefault();
                handleSelect(city);
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              className={cn(
                'cursor-pointer px-4 py-3 text-base text-primary-900 min-h-[48px] flex items-center',
                i === focusedIndex && 'bg-surface-hover',
              )}
            >
              {renderHighlighted(city)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
