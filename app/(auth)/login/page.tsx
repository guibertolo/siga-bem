'use client';

import { useState } from 'react';
import { sendMagicLink } from '@/app/(auth)/login/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Ocorreu um erro ao enviar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: '48px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1B3A4B',
              marginBottom: '8px',
            }}
          >
            Siga Bem
          </h1>
          <p style={{ fontSize: '14px', color: '#2C5F7C' }}>
            Insira seu email para receber o link de acesso
          </p>
        </div>

        {success ? (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              fontSize: '14px',
              color: '#1B7A3D',
            }}
          >
            Link de acesso enviado! Verifique sua caixa de entrada.
          </div>
        ) : (
          <form action={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1B3A4B',
                  marginBottom: '4px',
                }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  padding: '0 16px',
                  fontSize: '16px',
                  color: '#1B3A4B',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  color: '#B91C1C',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '8px',
                backgroundColor: loading ? '#94A3B8' : '#2C5F7C',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
