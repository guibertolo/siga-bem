'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface CaminhaoData {
  [marca: string]: string[];
}

let cachedData: CaminhaoData | null = null;

async function loadData(): Promise<CaminhaoData> {
  if (cachedData) return cachedData;
  const res = await fetch('/data/caminhoes-brasil.json');
  cachedData = await res.json();
  return cachedData!;
}

interface CaminhaoAutocompleteProps {
  marcaValue: string;
  modeloValue: string;
  onMarcaChange: (value: string) => void;
  onModeloChange: (value: string) => void;
  marcaError?: string;
  modeloError?: string;
  inputClassName?: string;
}

export function CaminhaoAutocomplete({
  marcaValue,
  modeloValue,
  onMarcaChange,
  onModeloChange,
  marcaError,
  modeloError,
  inputClassName = '',
}: CaminhaoAutocompleteProps) {
  const [data, setData] = useState<CaminhaoData>({});
  const [marcaSuggestions, setMarcaSuggestions] = useState<string[]>([]);
  const [modeloSuggestions, setModeloSuggestions] = useState<string[]>([]);
  const [showMarca, setShowMarca] = useState(false);
  const [showModelo, setShowModelo] = useState(false);
  const marcaRef = useRef<HTMLDivElement>(null);
  const modeloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData().then(setData);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (marcaRef.current && !marcaRef.current.contains(e.target as Node)) setShowMarca(false);
      if (modeloRef.current && !modeloRef.current.contains(e.target as Node)) setShowModelo(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const marcas = Object.keys(data);

  const filterMarcas = useCallback((input: string) => {
    if (!input || input.length < 1) return marcas;
    const lower = input.toLowerCase();
    return marcas.filter(m => m.toLowerCase().includes(lower));
  }, [marcas]);

  const filterModelos = useCallback((marca: string, input: string) => {
    const modelos = data[marca] ?? [];
    if (!input || input.length < 1) return modelos;
    const lower = input.toLowerCase();
    return modelos.filter(m => m.toLowerCase().includes(lower));
  }, [data]);

  function handleMarcaInput(val: string) {
    onMarcaChange(val);
    setMarcaSuggestions(filterMarcas(val));
    setShowMarca(true);
    // Reset modelo when marca changes
    if (val !== marcaValue) {
      onModeloChange('');
    }
  }

  function handleMarcaSelect(marca: string) {
    onMarcaChange(marca);
    setShowMarca(false);
    // Pre-populate modelo suggestions
    setModeloSuggestions(data[marca] ?? []);
  }

  function handleModeloInput(val: string) {
    onModeloChange(val);
    // Find matching marca for modelo suggestions
    const matchedMarca = marcas.find(m => m.toLowerCase() === marcaValue.toLowerCase());
    setModeloSuggestions(filterModelos(matchedMarca ?? '', val));
    setShowModelo(true);
  }

  function handleModeloSelect(modelo: string) {
    onModeloChange(modelo);
    setShowModelo(false);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Marca */}
      <div ref={marcaRef} className="relative">
        <label htmlFor="cam-marca" className="mb-2 block text-base font-medium text-primary-700">
          Marca
        </label>
        <input
          id="cam-marca"
          type="text"
          value={marcaValue}
          onChange={(e) => handleMarcaInput(e.target.value)}
          onFocus={() => { setMarcaSuggestions(filterMarcas(marcaValue)); setShowMarca(true); }}
          placeholder="Ex: Scania, Volvo, Mercedes"
          className={inputClassName}
          autoComplete="off"
        />
        {marcaError && <p className="mt-1.5 text-sm text-danger font-medium">{marcaError}</p>}

        {showMarca && marcaSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-lg">
            {marcaSuggestions.map((marca) => (
              <button
                key={marca}
                type="button"
                onClick={() => handleMarcaSelect(marca)}
                className="flex w-full items-center px-4 py-3 text-left text-base text-primary-900 transition-colors hover:bg-surface-hover min-h-[48px]"
              >
                {marca}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modelo */}
      <div ref={modeloRef} className="relative">
        <label htmlFor="cam-modelo" className="mb-2 block text-base font-medium text-primary-700">
          Modelo *
        </label>
        <input
          id="cam-modelo"
          type="text"
          value={modeloValue}
          onChange={(e) => handleModeloInput(e.target.value)}
          onFocus={() => {
            const matched = marcas.find(m => m.toLowerCase() === marcaValue.toLowerCase());
            setModeloSuggestions(filterModelos(matched ?? '', modeloValue));
            setShowModelo(true);
          }}
          placeholder="Ex: R450, FH 540, Actros 2651"
          className={inputClassName}
          autoComplete="off"
        />
        {modeloError && <p className="mt-1.5 text-sm text-danger font-medium">{modeloError}</p>}

        {showModelo && modeloSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-lg">
            {modeloSuggestions.map((modelo) => (
              <button
                key={modelo}
                type="button"
                onClick={() => handleModeloSelect(modelo)}
                className="flex w-full items-center px-4 py-3 text-left text-base text-primary-900 transition-colors hover:bg-surface-hover min-h-[48px]"
              >
                {modelo}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
