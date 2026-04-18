'use client';

import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { z } from 'zod';
import { useState, useTransition, useRef, useCallback } from 'react';
import { validatePlaca, maskPlaca } from '@/lib/utils/validate-placa';
import { validateRenavam } from '@/lib/utils/validate-renavam';
import { maskKm } from '@/lib/utils/mask-km';
import { maskCurrency } from '@/lib/utils/mask-currency';
import { maskDate, isoToDisplay } from '@/lib/utils/mask-date';
import { parseBrlInputToCentavos } from '@/lib/utils/currency';
import { isValidDateBr } from '@/lib/utils/validate-date-br';
import { TIPO_CEGONHA_OPTIONS } from '@/types/caminhao';
import { CaminhaoAutocomplete } from '@/components/ui/CaminhaoAutocomplete';
import {
  compressImage,
  isCompressibleImage,
  validateFileType,
  ACCEPT_STRING,
} from '@/lib/utils/compress-image';
import {
  uploadIpvaComprovante,
  deleteIpvaComprovante,
} from '@/app/(dashboard)/caminhoes/ipva-comprovante-actions';
import type { Caminhao, CaminhaoFormData, CaminhaoActionResult } from '@/types/caminhao';
import { cn } from '@/lib/utils/cn';

const caminhaoFormSchema = z.object({
  placa: z.string()
    .min(1, 'Placa é obrigatória')
    .refine((val) => validatePlaca(val), 'Placa inválida. Use formato Mercosul (ABC1D23) ou antigo (ABC-1234)'),
  modelo: z.string()
    .min(1, 'Modelo é obrigatório')
    .max(100, 'Modelo deve ter no máximo 100 caracteres'),
  marca: z.string().max(100),
  ano: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = parseInt(val, 10);
      const maxYear = new Date().getFullYear() + 1;
      return !isNaN(num) && num >= 1970 && num <= maxYear;
    },
    'Ano inválido',
  ),
  renavam: z.string().refine(
    (val) => validateRenavam(val),
    'RENAVAM inválido',
  ),
  tipo_cegonha: z.enum(['aberta', 'fechada'], {
    error: 'Selecione o tipo de cegonha',
  }),
  capacidade_veiculos: z.string()
    .min(1, 'Capacidade é obrigatória')
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1 && num <= 15;
      },
      'Capacidade deve ser entre 1 e 15',
    ),
  km_atual: z.string().refine(
    (val) => {
      if (val === '' || val === '0') return true;
      const num = parseInt(val.replace(/\./g, ''), 10);
      return !isNaN(num) && num >= 0;
    },
    'Km deve ser positivo',
  ),
  observacao: z.string().max(500),
  doc_vencimento: z.string().refine(isValidDateBr, 'Data invalida. Use DD/MM/AAAA'),
  ipva_pago: z.boolean().default(false),
  ipva_valor_centavos: z.string().refine(
    (val) => {
      if (val === '' || val === '0,00') return true;
      const centavos = parseBrlInputToCentavos(val);
      return centavos !== null && centavos >= 0;
    },
    'Valor invalido',
  ),
  ipva_ano_referencia: z.string().refine(
    (val) => {
      if (val === '') return true;
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 2000 && num <= new Date().getFullYear() + 1;
    },
    'Ano invalido',
  ),
});

type FormValues = z.infer<typeof caminhaoFormSchema>;

interface CaminhaoFormProps {
  caminhao?: Caminhao | null;
  mode: 'create' | 'edit';
  onSubmit: (data: CaminhaoFormData) => Promise<CaminhaoActionResult>;
}

export function CaminhaoForm({ caminhao, mode, onSubmit }: CaminhaoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(caminhao?.ipva_comprovante_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(caminhaoFormSchema),
    defaultValues: {
      placa: caminhao?.placa ? maskPlaca(caminhao.placa) : '',
      modelo: caminhao?.modelo ?? '',
      marca: caminhao?.marca ?? '',
      ano: caminhao?.ano?.toString() ?? '',
      renavam: caminhao?.renavam ?? '',
      tipo_cegonha: caminhao?.tipo_cegonha ?? 'aberta',
      capacidade_veiculos: caminhao?.capacidade_veiculos?.toString() ?? '11',
      km_atual: caminhao?.km_atual ? maskKm(caminhao.km_atual.toString()) : '0',
      observacao: caminhao?.observacao ?? '',
      doc_vencimento: caminhao?.doc_vencimento ? isoToDisplay(caminhao.doc_vencimento) : '',
      ipva_pago: caminhao?.ipva_pago ?? false,
      ipva_valor_centavos: caminhao?.ipva_valor_centavos ? maskCurrency(String(caminhao.ipva_valor_centavos)) : '',
      ipva_ano_referencia: caminhao?.ipva_ano_referencia?.toString() ?? '',
    },
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caminhao?.id) return;

    setUploadError(null);

    const validationError = validateFileType(file);
    if (validationError) {
      setUploadStatus('error');
      setUploadError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setUploadStatus('uploading');

      let processedFile: Blob = file;
      let contentType = file.type;

      if (isCompressibleImage(file.type)) {
        processedFile = await compressImage(file);
        contentType = 'image/jpeg';
      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('caminhaoId', caminhao.id);
      formData.append('contentType', contentType);

      const result = await uploadIpvaComprovante(formData);

      if (result.success) {
        setUploadStatus('success');
        setComprovanteUrl(result.url ?? null);
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        setUploadStatus('error');
        setUploadError(result.error ?? 'Erro ao enviar comprovante');
      }
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [caminhao?.id]);

  const handleDeleteComprovante = useCallback(async () => {
    if (!caminhao?.id) return;
    setUploadError(null);
    setUploadStatus('uploading');

    const result = await deleteIpvaComprovante(caminhao.id);
    if (result.success) {
      setComprovanteUrl(null);
      setUploadStatus('idle');
    } else {
      setUploadStatus('error');
      setUploadError(result.error ?? 'Erro ao remover');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }, [caminhao?.id]);

  function handleMaskedChange(
    field: keyof FormValues,
    maskFn: (value: string) => string,
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskFn(e.target.value);
      setValue(field, masked, { shouldValidate: false });
      e.target.value = masked;
    };
  }

  async function onFormSubmit(values: FormValues) {
    setServerError(null);

    startTransition(async () => {
      const result = await onSubmit(values as CaminhaoFormData);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            if (message) {
              setError(field as keyof FormValues, { message });
            }
          }
        }
        if (result.error) {
          setServerError(result.error);
        }
      }
    });
  }

  const isEditing = mode === 'edit';
  const inputClass = 'w-full rounded-lg border px-4 py-3 text-base outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg border border-danger/20 bg-alert-danger-bg p-4 text-base text-danger">
          {serverError}
        </div>
      )}

      {/* Placa + Tipo Cegonha row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="placa" className="mb-2 block text-base font-medium text-primary-900">
            Placa <span className="text-danger">*</span>
          </label>
          <input
            id="placa"
            type="text"
            placeholder="ABC1D23 ou ABC-1234"
            maxLength={8}
            {...register('placa', {
              onChange: handleMaskedChange('placa', maskPlaca),
            })}
            className={cn(inputClass, errors.placa ? 'border-danger' : 'border-surface-border')}
          />
          {errors.placa && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.placa.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="tipo_cegonha" className="mb-2 block text-base font-medium text-primary-900">
            Tipo Cegonha <span className="text-danger">*</span>
          </label>
          <select
            id="tipo_cegonha"
            {...register('tipo_cegonha')}
            className={cn(inputClass, errors.tipo_cegonha ? 'border-danger' : 'border-surface-border')}
          >
            {TIPO_CEGONHA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.tipo_cegonha && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.tipo_cegonha.message}</p>
          )}
        </div>
      </div>

      {/* Marca + Modelo row — autocomplete inteligente */}
      <CaminhaoAutocomplete
        marcaValue={watch('marca') ?? ''}
        modeloValue={watch('modelo')}
        onMarcaChange={(val) => setValue('marca', val)}
        onModeloChange={(val) => setValue('modelo', val)}
        marcaError={undefined}
        modeloError={errors.modelo?.message}
        inputClassName={cn(inputClass, 'border-surface-border')}
      />

      {/* Ano + RENAVAM row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ano" className="mb-2 block text-base font-medium text-primary-900">
            Ano
          </label>
          <input
            id="ano"
            type="number"
            placeholder="Ex: 2023"
            min={1970}
            max={new Date().getFullYear() + 1}
            {...register('ano')}
            className={cn(inputClass, errors.ano ? 'border-danger' : 'border-surface-border')}
          />
          {errors.ano && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.ano.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="renavam" className="mb-2 block text-base font-medium text-primary-900">
            RENAVAM
          </label>
          <input
            id="renavam"
            type="text"
            placeholder="11 digitos (opcional)"
            maxLength={11}
            {...register('renavam')}
            className={cn(inputClass, errors.renavam ? 'border-danger' : 'border-surface-border')}
          />
          {errors.renavam && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.renavam.message}</p>
          )}
        </div>
      </div>

      {/* Capacidade + Km row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="capacidade_veiculos" className="mb-2 block text-base font-medium text-primary-900">
            Capacidade (veículos) <span className="text-danger">*</span>
          </label>
          <input
            id="capacidade_veiculos"
            type="number"
            min={1}
            max={15}
            {...register('capacidade_veiculos')}
            className={cn(inputClass, errors.capacidade_veiculos ? 'border-danger' : 'border-surface-border')}
          />
          {errors.capacidade_veiculos && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.capacidade_veiculos.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="km_atual" className="mb-2 block text-base font-medium text-primary-900">
            Km Atual
          </label>
          <input
            id="km_atual"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 320.450"
            {...register('km_atual', {
              onChange: handleMaskedChange('km_atual', maskKm),
            })}
            className={cn(inputClass, errors.km_atual ? 'border-danger' : 'border-surface-border')}
          />
          {errors.km_atual && (
            <p className="mt-1.5 text-sm text-danger font-medium">{errors.km_atual.message}</p>
          )}
        </div>
      </div>

      {/* Observacao */}
      <div>
        <label htmlFor="observacao" className="mb-2 block text-base font-medium text-primary-900">
          Observação</label>
        <textarea
          id="observacao"
          rows={3}
          placeholder="Observações adicionais (opcional)"
          {...register('observacao')}
          className={cn(inputClass, 'border-surface-border')}
        />
      </div>

      {/* Documentacao section */}
      <fieldset className="space-y-4 rounded-xl border border-surface-border p-4">
        <legend className="px-2 text-lg font-semibold text-primary-900">Documentacao</legend>

        {/* Vencimento CRLV + Ano IPVA */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="doc_vencimento" className="mb-2 block text-base font-medium text-primary-900">
              Vencimento CRLV
            </label>
            <input
              id="doc_vencimento"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              {...register('doc_vencimento', {
                onChange: handleMaskedChange('doc_vencimento', maskDate),
              })}
              className={cn(inputClass, errors.doc_vencimento ? 'border-danger' : 'border-surface-border')}
            />
            {errors.doc_vencimento && (
              <p className="mt-1.5 text-sm text-danger font-medium">{errors.doc_vencimento.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="ipva_ano_referencia" className="mb-2 block text-base font-medium text-primary-900">
              Ano IPVA
            </label>
            <input
              id="ipva_ano_referencia"
              type="number"
              placeholder={`Ex: ${new Date().getFullYear()}`}
              min={2000}
              max={new Date().getFullYear() + 1}
              {...register('ipva_ano_referencia')}
              className={cn(inputClass, errors.ipva_ano_referencia ? 'border-danger' : 'border-surface-border')}
            />
            {errors.ipva_ano_referencia && (
              <p className="mt-1.5 text-sm text-danger font-medium">{errors.ipva_ano_referencia.message}</p>
            )}
          </div>
        </div>

        {/* IPVA Pago checkbox + Valor */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 min-h-[48px]">
            <input
              id="ipva_pago"
              type="checkbox"
              {...register('ipva_pago')}
              className="h-6 w-6 rounded border-surface-border text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="ipva_pago" className="text-base font-medium text-primary-900 cursor-pointer select-none">
              IPVA pago
            </label>
          </div>

          <div>
            <label htmlFor="ipva_valor_centavos" className="mb-2 block text-base font-medium text-primary-900">
              Valor IPVA (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-primary-500 pointer-events-none">
                R$
              </span>
              <input
                id="ipva_valor_centavos"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                {...register('ipva_valor_centavos', {
                  onChange: handleMaskedChange('ipva_valor_centavos', maskCurrency),
                })}
                className={cn(inputClass, 'pl-10', errors.ipva_valor_centavos ? 'border-danger' : 'border-surface-border')}
              />
            </div>
            {errors.ipva_valor_centavos && (
              <p className="mt-1.5 text-sm text-danger font-medium">{errors.ipva_valor_centavos.message}</p>
            )}
          </div>
        </div>

        {/* Upload comprovante IPVA */}
        <div>
          <label className="mb-2 block text-base font-medium text-primary-900">
            Comprovante IPVA
          </label>

          {isEditing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary-300 px-4 py-3 text-base text-primary-500 transition-colors min-h-[48px]',
                    'hover:border-primary-500 hover:bg-primary-100',
                    uploadStatus === 'uploading' && 'pointer-events-none opacity-50',
                  )}
                >
                  <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {uploadStatus === 'uploading' ? 'Enviando...' : 'Enviar Comprovante'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_STRING}
                    capture="environment"
                    onChange={handleFileUpload}
                    disabled={uploadStatus === 'uploading'}
                    className="hidden"
                  />
                </label>

                {comprovanteUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteComprovante}
                    disabled={uploadStatus === 'uploading'}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-alert-danger-bg min-h-[40px]"
                  >
                    Remover
                  </button>
                )}
              </div>

              {comprovanteUrl && (
                <p className="text-sm text-success font-medium">Comprovante enviado</p>
              )}

              {uploadStatus === 'success' && (
                <p className="text-sm text-success font-medium">Comprovante enviado com sucesso!</p>
              )}

              {uploadError && (
                <p className="text-sm text-danger font-medium">{uploadError}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Salve o caminhao primeiro para poder enviar o comprovante.
            </p>
          )}
        </div>
      </fieldset>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg bg-btn-primary px-6 py-3 text-base font-semibold text-white min-h-[48px] transition-colors',
            'hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            isPending && 'cursor-not-allowed opacity-50',
          )}
        >
          <svg className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Caminhão'}
        </button>
      </div>
    </form>
  );
}
