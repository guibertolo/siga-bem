# Plano de Onboarding Tutorial -- FrotaViva

> **Data:** 2026-03-30
> **Autor:** Atlas (Analyst Agent)
> **Confianca:** Alta (baseado em pesquisa de mercado, analise tecnica, e contexto do projeto)
> **Status:** Proposta para revisao

---

## TL;DR

Implementar um sistema de tutorial guiado no primeiro acesso usando **driver.js** (5kb, zero dependencias, framework-agnostic, compativel com React 19 / Next.js 16). Dois fluxos distintos: DONO (7 passos, foco em configuracao) e MOTORISTA (5 passos, foco em operacao diaria). Controle via `user_metadata.onboarding_completed` no Supabase Auth. Esforco estimado: 2-3 stories (8-13 story points).

---

## 1. Pesquisa: Melhores Praticas para Onboarding 55+

### O que funciona para usuarios com baixa familiaridade digital

| Principio | Aplicacao no FrotaViva | Fonte |
|-----------|----------------------|-------|
| **Linguagem simples, zero jargao** | Todos os textos em PT-BR coloquial. "Cadastre" em vez de "Registre". "Avance" em vez de "Prosseguir". | Toptal UI Guide for Older Adults |
| **Alvos de toque grandes (min 48px)** | Botoes do tutorial com min 48x48px, consistente com o padrao ja adotado no FrotaViva | Apple HIG + feedback UX 55+ |
| **Progressive disclosure** | Mostrar um passo por vez, nunca 3+ informacoes simultaneas | UX Design Institute |
| **Feedback visual imediato** | Ao clicar "Proximo", animacao suave de transicao entre passos | PMC Mobile Design for Older Adults |
| **Permitir reler instrucoes** | Botao "Voltar" em cada passo + opcao de reiniciar tutorial | Formbricks Best Practices |
| **Nao assumir conhecimento previo** | Explicar O QUE e o elemento E POR QUE ele importa | ProductLed SaaS Onboarding |
| **Ritmo controlado pelo usuario** | Sem auto-avancar. Usuario decide quando avancar | Cieden SaaS UX |

### Erros comuns a evitar

1. **Tooltips pequenos demais** -- fonte minima 16px no corpo, 18px ideal para 55+
2. **Muitos passos de uma vez** -- maximo 7 passos para DONO, 5 para MOTORISTA
3. **Tutorial obrigatorio sem saida** -- sempre oferecer "Pular tutorial"
4. **Linguagem tecnica** -- nunca "dashboard", "vincular entidade", "configurar parametro"
5. **Animacoes rapidas** -- transicoes de 400ms minimo (padrao 300ms e rapido demais para 55+)

---

## 2. Tipos de Onboarding Avaliados

| Tipo | Descricao | Pros | Contras | Adequado? |
|------|-----------|------|---------|-----------|
| **Spotlight/Tooltip Tour** | Destaca elemento na tela com tooltip explicativo | Contextual, leve, nao sai da pagina | Limitado a elementos visiveis | **SIM -- recomendado** |
| **Step-by-step Wizard** | Tela cheia com formulario guiado | Muito controlado | Tira o usuario do contexto real | Parcial (so boas-vindas) |
| **Video tutorial** | Video embutido explicando o sistema | Familiar para 55+ | Caro de produzir, nao interativo, desatualiza rapido | Complementar (futuro) |
| **Interactive walkthrough** | Usuario executa a acao real durante o tutorial | Aprendizado por pratica | Complexo de implementar, risco de erro | Fase 2 |
| **Checklist persistente** | Lista de tarefas no canto da tela | Visivel, senso de progresso | Pode ser ignorado | Complementar |

**Decisao:** Spotlight/Tooltip Tour como primario, com tela de boas-vindas (wizard) no primeiro passo.

---

## 3. Analise de Concorrentes

### Cobli
- **Modelo:** Plug-and-play com hardware (OBD). Onboarding e feito presencialmente pela equipe comercial + suporte tecnico
- **App motorista:** Foco em telemetria passiva; motorista nao precisa registrar dados manualmente
- **Tutorial in-app:** Nao identificado. Depende de treinamento humano + WhatsApp suporte
- **Publico:** Frotas corporativas maiores, gestores com equipe de TI

### Infleet
- **Modelo:** Plataforma completa com integracao IoT
- **Onboarding:** Implantacao assistida com equipe tecnica dedicada
- **Tutorial in-app:** Blog com conteudo educativo, mas sem tutorial guiado identificado
- **Publico:** Gestores de frota profissionais, empresas medias/grandes

### Sofit
- **Modelo:** Software de gestao de frotas (sem hardware)
- **Onboarding:** Demonstracao comercial + setup assistido
- **Tutorial in-app:** Nao identificado publicamente
- **Publico:** Frotas corporativas, setor publico

### Oportunidade FrotaViva

Nenhum concorrente brasileiro de gestao de frotas oferece tutorial guiado in-app self-service. Todos dependem de onboarding humano (vendedor, suporte, implantador). Para cegonheiros autonomos/pequenas empresas que NAO tem equipe de TI, um tutorial automatizado e um **diferencial competitivo significativo**. E a unica forma viavel de escalar sem custo de suporte por cliente.

**Nivel de confianca:** Medio. A pesquisa sobre concorrentes e limitada a informacao publica. Onboarding interno dos concorrentes nao e visivel externamente.

---

## 4. Comparacao de Bibliotecas

### Criterios de avaliacao (peso para o FrotaViva)

| Criterio | Peso | Justificativa |
|----------|------|---------------|
| Compatibilidade React 19 | Critico | FrotaViva usa React 19.2 + Next.js 16 |
| Bundle size | Alto | Motoristas usam celular com 4G limitado |
| Mobile-friendly | Critico | Motoristas acessam 100% via celular |
| Customizacao visual (Tailwind) | Alto | FrotaViva usa Tailwind CSS 4 |
| Acessibilidade (a11y) | Alto | Publico 55+, baixa familiaridade |
| Licenca | Alto | FrotaViva e SaaS comercial |
| Manutencao ativa | Medio | Evitar libs abandonadas |

### Comparacao detalhada

| Biblioteca | React 19 | Bundle | Mobile | Tailwind | a11y | Licenca | Manutencao | Score |
|-----------|----------|--------|--------|----------|------|---------|------------|-------|
| **driver.js** | Sim (vanilla JS) | **~5kb gz** | Sim | CSS classes | Boa | MIT | Ativa (v1.4, 2026) | **9/10** |
| **shepherd.js** | Sim (PR merged) | ~12kb gz | Sim | CSS classes | Boa | MIT (free) / Comercial (pro) | Muito ativa | 7/10 |
| **react-joyride** | **NAO** | ~15kb gz | Parcial | Inline only | Media | MIT | **Inativa 9+ meses** | 3/10 |
| **intro.js** | Sim (vanilla) | ~10kb gz | Sim | CSS classes | **Ruim** (aria ausente) | Comercial ($) | Manutencao so | 4/10 |
| **reactour** | Incerto | ~8kb gz | Sim | Styled-comp | Media | MIT | Baixa | 5/10 |
| **onboardjs** | Sim | ~3kb gz | Sim | Headless | Boa | MIT | Nova (2025) | 6/10 |

### Recomendacao: driver.js

**Razoes:**

1. **Zero dependencias, vanilla TypeScript** -- nao depende de wrappers React que quebram entre versoes. Funciona com qualquer framework porque opera no DOM diretamente
2. **5kb gzipped** -- o menor de todos. Critico para motoristas em 4G
3. **MIT license** -- sem custo comercial, sem restricoes
4. **CSS customizavel** -- classes CSS padrao, integracao natural com Tailwind
5. **Excelente suporte mobile** -- responsivo por padrao, posicionamento automatico
6. **API simples** -- curva de aprendizado minima para o dev
7. **Highlight + popover + overlay** -- todos os patterns necessarios em um so pacote

**Riscos:**
- Biblioteca mantida por 1 pessoa (Kamran Ahmed, criador do roadmap.sh). Risco baixo dado a simplicidade do codigo (vanilla JS, sem dependencias)
- Nao tem React wrapper oficial, mas nao precisa -- e chamado imperativamente

**Alternativa de fallback:** Se driver.js apresentar problemas, shepherd.js e a segunda opcao. O PR de React 19 ja foi mergeado e a comunidade e robusta (170+ releases, 100+ contribuidores).

---

## 5. Fluxo do Tutorial -- DONO (Primeiro Login)

### Pre-condicao
- `user_metadata.onboarding_completed` === `false` ou `undefined`
- `role` === `'dono'`
- Email NAO termina com `@frotaviva.com.br` (contas de teste)

### Sequencia

```
[Tela de Boas-Vindas]
       |
[Passo 1: Sidebar "Caminhoes"]
       |
[Passo 2: Botao "Novo Caminhao"]
       |
[Passo 3: Sidebar "Motoristas"]
       |
[Passo 4: Sidebar "Vinculos"]
       |
[Passo 5: Sidebar "Viagens" + "Nova Viagem"]
       |
[Passo 6: Sidebar "Resumo dos Gastos" (BI)]
       |
[Tela de Conclusao]
```

### Detalhamento dos passos

| Passo | Elemento alvo (CSS selector) | Titulo | Descricao | Acao |
|-------|------------------------------|--------|-----------|------|
| 0 (Welcome) | Modal central (sem highlight) | "Bem-vindo ao FrotaViva!" | "Vamos te mostrar como configurar sua operacao em poucos minutos. Voce pode pular a qualquer momento." | Botao "Comecar" |
| 1 | `nav a[href="/caminhoes"]` | "Seus Caminhoes" | "Aqui voce cadastra todos os caminhoes da sua frota. Placa, modelo, ano -- tudo organizado." | Proximo |
| 2 | `nav a[href="/caminhoes"]` (mesmo, com popover apontando para acao) | "Cadastre o primeiro" | "Clique em 'Caminhoes' e depois em 'Novo Caminhao' para comecar. Voce pode fazer isso agora ou depois." | Proximo |
| 3 | `nav a[href="/motoristas"]` | "Seus Motoristas" | "Cadastre os motoristas que trabalham com voce. Eles vao poder registrar viagens e gastos pelo celular." | Proximo |
| 4 | `nav a[href="/vinculos"]` | "Vincule Motorista e Caminhao" | "Diga qual motorista dirige qual caminhao. Assim o sistema sabe quem esta responsavel por cada veiculo." | Proximo |
| 5 | `nav a[href="/viagens"]` | "Crie uma Viagem" | "Registre cada viagem: de onde saiu, para onde foi, quantos km rodou. Isso alimenta seus relatorios." | Proximo |
| 6 | `nav a[href="/bi"]` | "Acompanhe seus Resultados" | "Aqui voce ve o resumo de tudo: gastos, consumo de combustivel, desempenho dos motoristas. Sua frota num so lugar." | Proximo |
| 7 (Done) | Modal central | "Pronto! Sua frota esta configurada." | "Voce pode refazer este tutorial a qualquer momento em 'Meu Perfil'. Bom trabalho!" | Botao "Comecar a usar" |

### Notas de UX para 55+

- **Fonte do popover:** min 16px corpo, 20px titulo
- **Botoes:** min 48px altura, cores contrastantes (primario do tema)
- **Animacao:** transicao 400ms ease-in-out entre passos
- **Overlay:** escurecimento 60% (suficiente para foco sem assustar)
- **Posicionamento:** popover sempre posicionado para nao cobrir o elemento destacado
- **Mobile:** em telas < 768px, popover aparece abaixo do elemento (nunca ao lado)
- **Progresso:** indicador "Passo 3 de 7" visivel em cada etapa

---

## 6. Fluxo do Tutorial -- MOTORISTA (Primeiro Login)

### Pre-condicao
- `user_metadata.onboarding_completed` === `false` ou `undefined`
- `role` === `'motorista'`
- Ja completou troca de senha (`must_change_password` === `false`)
- Email NAO termina com `@frotaviva.com.br`

### Sequencia

```
[Tela de Boas-Vindas]
       |
[Passo 1: "Minhas Viagens"]
       |
[Passo 2: Registro de abastecimento]
       |
[Passo 3: Registro de despesas]
       |
[Passo 4: "Inicio" (painel)]
       |
[Tela de Conclusao]
```

### Detalhamento dos passos

| Passo | Elemento alvo | Titulo | Descricao | Acao |
|-------|--------------|--------|-----------|------|
| 0 (Welcome) | Modal central | "Bem-vindo!" | "Vamos te mostrar como usar o FrotaViva para registrar suas viagens. E rapido!" | Botao "Comecar" |
| 1 | `nav a[href="/viagens"]` | "Suas Viagens" | "Aqui aparecem todas as suas viagens. As que estao em andamento e as que ja terminaram." | Proximo |
| 2 | Contextual (dentro da viagem) | "Registre Abastecimento" | "Durante uma viagem, voce registra cada vez que abasteceu. Valor, litros e km do odometro." | Proximo |
| 3 | Contextual (dentro da viagem) | "Registre Despesas" | "Pedagio, borracheiro, alimentacao -- registre tudo aqui para o acerto ficar certinho." | Proximo |
| 4 | `nav a[href="/dashboard"]` | "Seu Painel" | "Aqui voce ve um resumo das suas viagens e como esta seu desempenho. Tudo num so lugar." | Proximo |
| 5 (Done) | Modal central | "Pronto! Bom trabalho!" | "Se precisar rever este tutorial, va em 'Meu Perfil'. Boa viagem!" | Botao "Comecar a usar" |

### Nota sobre mobile-first para motorista

O motorista acessa **exclusivamente via celular**. O tutorial precisa:
- Usar o **MobileSidebar** (hamburger menu) como referencia, nao a sidebar desktop
- Popovers posicionados abaixo dos elementos, nunca ao lado
- Botoes de acao ocupando 100% da largura em telas pequenas
- Texto curto (max 2 linhas por descricao)

---

## 7. Plano Tecnico de Implementacao

### 7.1 Instalacao

```bash
npm install driver.js
```

### 7.2 Arquitetura de componentes

```
components/
  onboarding/
    OnboardingProvider.tsx       # Context provider (client component)
    OnboardingTour.tsx           # Componente principal do tour
    useOnboarding.ts             # Hook customizado
    onboarding-config.ts         # Configuracao dos passos por role
    onboarding.css               # Estilos customizados (override driver.js)
```

### 7.3 Fluxo tecnico

```
Dashboard Layout (server component)
  |
  +-- Verifica role + user_metadata.onboarding_completed
  |
  +-- Se onboarding pendente: renderiza <OnboardingProvider>
        |
        +-- OnboardingTour (client component)
              |
              +-- useEffect: inicializa driver.js com config do role
              |
              +-- Ao completar: chama server action para marcar completed
              |
              +-- Ao pular: mesma server action
```

### 7.4 Persistencia (Supabase Auth)

**Campo:** `user_metadata.onboarding_completed`

```typescript
// Marcar onboarding como completo
await supabase.auth.updateUser({
  data: { onboarding_completed: true }
});
```

**Motivo de usar `user_metadata` e nao uma tabela separada:**
- Ja existe o pattern no projeto (`must_change_password` usa `user_metadata`)
- Evita join adicional em toda requisicao
- Atualiza via Supabase Auth SDK sem migration
- Unico dado necessario e um booleano

### 7.5 Reiniciar tutorial

Na pagina `/perfil`, adicionar botao "Refazer Tutorial":

```typescript
// Reset onboarding
await supabase.auth.updateUser({
  data: { onboarding_completed: false }
});
// Redirecionar para /dashboard (trigger do tour)
```

### 7.6 Skip para contas de teste

```typescript
const isTestAccount = user.email?.endsWith('@frotaviva.com.br');
const shouldShowOnboarding = !isTestAccount && !user.user_metadata?.onboarding_completed;
```

### 7.7 Tratamento de telas mobile vs desktop

O componente `OnboardingTour` deve detectar viewport e ajustar selectors:

| Elemento | Desktop selector | Mobile selector |
|----------|-----------------|-----------------|
| Sidebar links | `aside nav a[href="..."]` | Abrir MobileSidebar primeiro, depois destacar link |
| BI link | `aside a[href="/bi"]` | Hamburger -> link dentro do drawer |

**Abordagem mobile:** Antes de cada passo que referencia a sidebar, programaticamente abrir o MobileSidebar (trigger click no hamburger) e entao destacar o link dentro do drawer.

### 7.8 Customizacao visual

```css
/* onboarding.css -- override driver.js defaults */
.driver-popover {
  font-family: inherit;
  font-size: 16px;
  line-height: 1.6;
  max-width: 360px;
  border-radius: 12px;
  padding: 20px 24px;
}

.driver-popover-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.driver-popover-description {
  font-size: 16px;
  color: var(--color-text-secondary);
}

.driver-popover-footer button {
  min-height: 48px;
  min-width: 120px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

.driver-popover-progress-text {
  font-size: 14px;
}

/* Dark mode support */
[data-theme="dark"] .driver-popover {
  background: var(--color-surface-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-surface-border);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .driver-popover {
    max-width: calc(100vw - 32px);
    margin: 0 16px;
  }

  .driver-popover-footer button {
    width: 100%;
  }
}
```

---

## 8. Estimativa de Esforco

### Story breakdown sugerido

| Story | Descricao | Pontos | Fase |
|-------|-----------|--------|------|
| **S1: Infraestrutura do onboarding** | Instalar driver.js, criar OnboardingProvider, hook, CSS customizado, server action para marcar completo, botao "Pular" | 5 | Fase 1 |
| **S2: Tour do DONO** | Implementar os 7 passos do tour do dono (desktop + mobile), testar em ambos viewports | 5 | Fase 1 |
| **S3: Tour do MOTORISTA** | Implementar os 5 passos do tour do motorista (mobile-first), tratar abertura do drawer | 3 | Fase 1 |
| **S4: Reiniciar tutorial** | Botao em /perfil para reiniciar, logica de reset do user_metadata | 2 | Fase 2 |
| **S5: Melhorias pos-feedback** | Ajustes apos teste com usuarios reais (textos, ordem, timing) | 3 | Fase 2 |

**Total estimado:** 18 story points (Fase 1: 13, Fase 2: 5)

### Dependencias

- Nenhuma migration de banco necessaria (usa `user_metadata` existente)
- Nenhuma API externa necessaria
- driver.js e a unica dependencia nova (~5kb)

---

## 9. Abordagem em Fases

### Fase 1: MVP do Tutorial (Sprint 1)

**Objetivo:** Tutorial funcional para DONO e MOTORISTA no primeiro acesso.

- [ ] Instalar driver.js
- [ ] Criar componente OnboardingProvider + hook
- [ ] Customizar CSS (fonte grande, botoes 48px, dark mode)
- [ ] Implementar tour DONO (7 passos)
- [ ] Implementar tour MOTORISTA (5 passos)
- [ ] Server action para marcar `onboarding_completed`
- [ ] Botao "Pular tutorial" em todos os passos
- [ ] Skip automatico para @frotaviva.com.br
- [ ] Testar em mobile (Chrome DevTools + dispositivo real)

**Entregavel:** Usuarios novos veem tutorial automatico no primeiro login.

### Fase 2: Refinamento (Sprint 2)

- [ ] Botao "Refazer Tutorial" em /perfil
- [ ] Analytics: rastrear em qual passo usuarios pulam (identificar passos confusos)
- [ ] Ajuste de textos baseado em feedback real
- [ ] Tour contextual: ao criar primeira viagem, tooltip extra "Parabens! Sua primeira viagem."

### Fase 3: Evolucao (Futuro)

- [ ] Checklist persistente na sidebar ("Falta cadastrar motorista")
- [ ] Video curto opcional embutido no passo de boas-vindas
- [ ] Onboarding para role `admin` (funcionario do dono)
- [ ] Tour contextual para features novas (ex: ao lancar relatorio novo, tour especifico)

---

## 10. Metricas de Sucesso

| Metrica | Baseline (sem tutorial) | Meta (com tutorial) | Como medir |
|---------|------------------------|---------------------|------------|
| Usuarios que cadastram 1+ caminhao em 24h | Desconhecido | > 60% | Query Supabase |
| Usuarios que criam 1+ viagem em 48h | Desconhecido | > 40% | Query Supabase |
| Taxa de conclusao do tutorial | N/A | > 50% | `onboarding_completed` = true |
| Passo com maior abandono | N/A | Identificar | Analytics por passo |
| Chamados de suporte "como usar" | Baseline atual | -30% | Contagem manual |

---

## Fontes

- [5 Best React Onboarding Libraries 2026 -- OnboardJS](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared)
- [Evaluating Tour Libraries for React -- Sandro Roth](https://sandroroth.com/blog/evaluating-tour-libraries/)
- [React Onboarding Libraries -- UserGuiding](https://userguiding.com/blog/react-onboarding-tour)
- [React Product Tour Libraries -- Whatfix](https://whatfix.com/blog/react-onboarding-tour/)
- [Open Source Onboarding Tools 2026 -- Usertour](https://www.usertour.io/blog/open-source-onboarding-tools-2026)
- [Shepherd.js React 19 Support -- GitHub #3102](https://github.com/shipshapecode/shepherd/issues/3102)
- [driver.js Official](https://driverjs.com)
- [UI Design for Older Adults -- Toptal](https://www.toptal.com/designers/ui/ui-design-for-older-adults)
- [Optimizing Mobile Design for Older Adults -- PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12350549/)
- [User Onboarding Best Practices 2026 -- Formbricks](https://formbricks.com/blog/user-onboarding-best-practices)
- [SaaS Onboarding Best Practices -- ProductLed](https://productled.com/blog/5-best-practices-for-better-saas-user-onboarding)
- [SaaS Onboarding UX -- Cieden](https://cieden.com/saas-onboarding-best-practices-and-common-mistakes-ux-upgrade-article-digest)
- [Cobli -- Capterra](https://www.capterra.com/p/196258/Cobli/)
- [INFLEET](https://infleet.com.br/en/home/)
