# Requisitos do Onboarding do Motorista — PRIORIDADE ALTA

> Nota do stakeholder: O motorista e ESSENCIAL para o funcionamento do sistema. Sem ele alimentando dados, o dono nao tem nada para gerenciar. O onboarding do motorista deve ser tao detalhado quanto o do dono.

---

## Fluxo completo do motorista (cada passo guiado na pagina real)

### Passo 1: Bem-vindo
- Mensagem: "Voce e fundamental para o funcionamento da frota. Vamos te ensinar a usar o sistema."
- Tom acolhedor, reforcar a importancia do motorista

### Passo 2: Ver suas viagens
- Navegar para `/viagens`
- Mostrar a lista de viagens na tela real
- Explicar os status: **planejada**, **em andamento**, **concluida**

### Passo 3: Iniciar uma viagem
- Se tem viagem planejada, guiar o botao de iniciar
- Mostrar onde preencher km de saida
- Se nao tem viagem ativa, simular/explicar com prints ou pular para o proximo

### Passo 4: Registrar abastecimento
- Dentro da viagem em andamento, guiar o botao "+ Registrar Abastecimento"
- Explicar cada campo: litros, posto, valor, UF

### Passo 5: Registrar despesa
- Guiar o botao "+ Registrar Despesa"
- Explicar categorias: pedagio, alimentacao, etc.

### Passo 6: Anexar comprovante
- Mostrar como tirar foto ou anexar arquivo do comprovante apos registrar
- Destacar que comprovante e importante para prestacao de contas

### Passo 7: Finalizar viagem
- Guiar o botao de concluir viagem
- Explicar km de chegada

### Passo 8: Ver seus ganhos
- Navegar para `/dashboard`
- Mostrar o card de ganhos do mes

### Passo 9: Conclusao
- Mensagem: "Pronto! Seus registros ajudam o patrao a gerenciar melhor a frota. Bom trabalho na estrada!"

---

## Principios de Design

| Principio | Detalhe |
|-----------|---------|
| Linguagem simples | Publico 40-60 anos, baixa familiaridade digital |
| Tela real | Cada passo MOSTRA na tela real, nao so explica |
| Botao "Pular" | Sempre disponivel em todos os passos |
| Sem viagem ativa | Simular/explicar com prints ou pular para o proximo |
| Mobile-first | Motorista usa celular na estrada |

---

## Relacionados
- `onboarding-tutorial-plan.md` — Plano geral do tutorial de onboarding
