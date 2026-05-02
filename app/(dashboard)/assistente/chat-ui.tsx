'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRef, useEffect, useState } from 'react';

const PERGUNTAS_FAROL = [
  'Qual caminhão deu mais prejuízo esse mês?',
  'Qual motorista gasta mais combustível?',
  'Me faz um resumo do desempenho da última semana',
  'Quais motoristas estão com CNH vencendo?',
  'Qual viagem teve maior margem?',
  'Qual rota tá dando mais lucro?',
];

const FOLLOWUP_REGEX = /\[FOLLOWUP\](.*?)\[\/FOLLOWUP\]/g;

function parseFollowups(text: string): { cleanText: string; followups: string[] } {
  const followups: string[] = [];
  let match;
  while ((match = FOLLOWUP_REGEX.exec(text)) !== null) {
    const q = match[1].trim();
    if (q) followups.push(q);
  }
  FOLLOWUP_REGEX.lastIndex = 0;
  const cleanText = text.replace(FOLLOWUP_REGEX, '').trimEnd();
  return { cleanText, followups };
}

const transport = new DefaultChatTransport({
  api: '/api/assistente/chat',
});

interface Alerta {
  tipo: 'critico' | 'atencao' | 'info';
  icone: string;
  titulo: string;
  detalhe: string;
  pergunta: string;
}

export default function ChatUI({ alertas = [] }: { alertas?: Alerta[] }) {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === 'streaming' || status === 'submitted';
  const isBlocked = isStreaming;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(text?: string) {
    const value = text ?? input.trim();
    if (!value || isBlocked) return;
    sendMessage({ text: value });
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8rem)', maxWidth: '48rem', margin: '0 auto', width: '100%' }}>

      {/* Messages area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 8px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2D6A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-text-primary)', marginBottom: 8 }}>
              Assistente FrotaViva
            </h1>
            <p style={{ fontSize: 16, color: 'var(--c-text-secondary)', marginBottom: alertas.length > 0 ? 20 : 32, maxWidth: '26rem', lineHeight: 1.5 }}>
              Sua frota sob controle. Pergunte e acompanhe tudo.
            </p>

            {/* Alertas proativos */}
            {alertas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: '26rem', marginBottom: 24 }}>
                {alertas.map((alerta, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(alerta.pergunta); inputRef.current?.focus(); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: 15,
                      lineHeight: 1.4,
                      borderRadius: 10,
                      border: `2px solid ${alerta.tipo === 'critico' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.3)'}`,
                      backgroundColor: alerta.tipo === 'critico' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.06)',
                      color: 'var(--c-text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = alerta.tipo === 'critico' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = alerta.tipo === 'critico' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.06)';
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2, color: alerta.tipo === 'critico' ? '#fca5a5' : '#fcd34d' }}>
                      {alerta.titulo}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--c-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alerta.detalhe}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: '26rem' }}>
              {PERGUNTAS_FAROL.map((pergunta) => (
                <button
                  key={pergunta}
                  onClick={() => { setInput(pergunta); inputRef.current?.focus(); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    fontSize: 16,
                    lineHeight: 1.5,
                    borderRadius: 10,
                    border: '2px solid rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    color: 'var(--c-text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                >
                  {pergunta}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {messages.map((message, msgIndex) => {
          const isUser = message.role === 'user';
          const textContent = message.parts
            ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('') ?? '';

          if (!textContent) return null;

          const isLastAssistant = !isUser && msgIndex === messages.length - 1;
          const { cleanText, followups } = isUser
            ? { cleanText: textContent, followups: [] }
            : parseFollowups(textContent);

          return (
            <div key={message.id} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: 16,
                    lineHeight: 1.6,
                    ...(isUser
                      ? {
                          background: '#2D6A4F',
                          color: '#fff',
                        }
                      : {
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--c-text-primary)',
                        }),
                  }}
                >
                  {isUser ? (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{textContent}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&_table]:text-sm [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_table]:border-collapse [&_th]:border [&_th]:border-white/10 [&_td]:border [&_td]:border-white/10 [&_th]:bg-white/5 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {cleanText}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-up suggestions (only on last assistant message, not while streaming) */}
              {isLastAssistant && followups.length > 0 && !isStreaming && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 4 }}>
                  {followups.map((fup) => (
                    <button
                      key={fup}
                      onClick={() => { setInput(fup); inputRef.current?.focus(); }}
                      disabled={isBlocked}
                      style={{
                        padding: '8px 14px',
                        fontSize: 14,
                        lineHeight: 1.4,
                        borderRadius: 8,
                        border: '1px solid rgba(45,106,79,0.4)',
                        backgroundColor: 'rgba(45,106,79,0.1)',
                        color: 'var(--c-text-primary)',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: isBlocked ? 0.5 : 1,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isBlocked) {
                          e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.2)';
                          e.currentTarget.style.borderColor = 'rgba(45,106,79,0.6)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(45,106,79,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(45,106,79,0.4)';
                      }}
                    >
                      {fup}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px 16px 16px 4px' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 8, height: 8, background: 'var(--c-text-secondary)', borderRadius: '50%', animation: 'bounce 1.4s infinite', animationDelay: '0ms' }} />
                <span style={{ width: 8, height: 8, background: 'var(--c-text-secondary)', borderRadius: '50%', animation: 'bounce 1.4s infinite', animationDelay: '200ms' }} />
                <span style={{ width: 8, height: 8, background: 'var(--c-text-secondary)', borderRadius: '50%', animation: 'bounce 1.4s infinite', animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner — only show if last message is from user (no assistant response yet) */}
      {status === 'error' && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
        <div style={{ margin: '0 16px 8px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 10, fontSize: 16 }}>
          Tive um problema ao processar sua pergunta. Tente novamente.
        </div>
      )}

      {/* Input bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: '48rem', margin: '0 auto' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre sua frota..."
            rows={1}
            disabled={isBlocked}
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 128,
              padding: '12px 16px',
              fontSize: 16,
              lineHeight: 1.5,
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--c-text-primary)',
              border: '2px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              resize: 'none',
              outline: 'none',
              opacity: isBlocked ? 0.5 : 1,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2D6A4F'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isBlocked}
            style={{
              minHeight: 48,
              padding: '12px 20px',
              fontSize: 16,
              fontWeight: 600,
              background: !input.trim() || isBlocked ? 'rgba(45,106,79,0.4)' : '#2D6A4F',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: !input.trim() || isBlocked ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isBlocked ? 0.5 : 1,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {isStreaming ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
