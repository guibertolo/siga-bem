---
Data: 2026-03-31
Decisão do Stakeholder
---

# Tutorial Persistente — Decisão

## Decisão
O tutorial de onboarding deve ser **persistente entre sessões** até que o usuário:
1. Complete TODOS os passos, OU
2. Clique explicitamente em **"Pular Tutorial Completo"**

## Como funciona
- O progresso é salvo (qual passo está) no user_metadata
- Ao fazer login, o tutorial retoma de onde parou
- Cada página mostra o passo relevante se o tutorial está ativo
- Botão "Pular Tutorial Completo" visível em TODOS os passos
- Botões "Próximo" e "Anterior" para navegar entre passos
- NÃO tem "Pular este passo" individual — ou faz tudo ou pula tudo

## Metadata necessária
```
user_metadata: {
  onboarding_completed: boolean,      // true = tutorial finalizado
  onboarding_step: number,            // passo atual (0-8 para dono, 0-8 para motorista)
  onboarding_redo: boolean,           // true = solicitou refazer
}
```

## UX
- Ao entrar no sistema, se onboarding_step > 0 e onboarding_completed = false:
  → Redireciona para a página do passo atual
  → Mostra spotlight/tooltip do passo
  → Botão "Pular Tutorial Completo" fixo no canto

## Benefício
Público 55+ com baixa familiaridade digital não perde progresso. O sistema "insiste" gentilmente até que o usuário aprenda ou decida conscientemente pular.
