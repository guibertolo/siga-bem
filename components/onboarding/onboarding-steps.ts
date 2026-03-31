import type { DriveStep } from 'driver.js';

/**
 * Step definition for the persistent multi-page onboarding tutorial.
 * Each step maps to a page in the dashboard and includes driver.js highlights.
 */
export interface OnboardingStepDef {
  /** Page path the user should be on for this step */
  page: string;
  /** Display title for the floating bar */
  title: string;
  /** Short description shown in the floating bar */
  description: string;
  /** Whether this step is a fullscreen overlay (welcome/conclusion) */
  overlay?: boolean;
  /** driver.js highlight steps for this page */
  highlights: DriveStep[];
}

/**
 * DONO onboarding: 10 steps (0-9), from welcome to conclusion.
 * Guides the fleet owner through the complete setup workflow.
 */
export function getDonoStepDefs(): OnboardingStepDef[] {
  return [
    // Step 0: Welcome overlay
    {
      page: '/dashboard',
      title: 'Bem-vindo ao FrotaViva!',
      description: 'Vamos configurar sua frota passo a passo.',
      overlay: true,
      highlights: [],
    },
    // Step 1: Caminhoes list — show "+ Novo Caminhao" button
    {
      page: '/caminhoes',
      title: 'Seus Caminhoes',
      description: 'Comece cadastrando seus caminhoes.',
      highlights: [
        {
          element: 'a[href="/caminhoes/cadastro"]',
          popover: {
            title: 'Cadastrar Caminhão',
            description:
              'Clique aqui para cadastrar seu primeiro caminhão. Você vai precisar da placa, marca, modelo e ano.',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    },
    // Step 2: Caminhoes cadastro — highlight form fields
    {
      page: '/caminhoes/cadastro',
      title: 'Formulario do Caminhao',
      description: 'Preencha os dados do caminhao.',
      highlights: [
        {
          element: 'h2',
          popover: {
            title: 'Cadastro de Caminhao',
            description:
              'Aqui voce cadastra caminhoes. Vamos preencher o primeiro juntos.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'input[name="placa"], [data-onboarding="placa"]',
          popover: {
            title: 'Placa',
            description: 'Digite a placa do caminhao. Exemplo: ABC1D23',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-onboarding="tipo-cegonha"], select[name="tipo_cegonha"]',
          popover: {
            title: 'Tipo da Cegonha',
            description: 'Selecione o tipo da cegonha.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'button[type="submit"]',
          popover: {
            title: 'Salvar',
            description: 'Quando preencher tudo, clique aqui para salvar.',
            side: 'top',
            align: 'center',
          },
        },
      ],
    },
    // Step 3: Motoristas list — show "+ Novo Motorista" button
    {
      page: '/motoristas',
      title: 'Seus Motoristas',
      description: 'Cadastre seus motoristas.',
      highlights: [
        {
          element: 'a[href="/motoristas/cadastro"]',
          popover: {
            title: 'Cadastrar Motorista',
            description:
              'Clique aqui para cadastrar seu primeiro motorista. Nome, CPF, CNH e percentual do frete.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 4: Motoristas cadastro — highlight form fields
    {
      page: '/motoristas/cadastro',
      title: 'Formulario do Motorista',
      description: 'Preencha os dados do motorista.',
      highlights: [
        {
          element: 'h2',
          popover: {
            title: 'Cadastro de Motorista',
            description:
              'Agora vamos cadastrar seu primeiro motorista.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'input[name="nome"], [data-onboarding="nome"]',
          popover: {
            title: 'Nome',
            description: 'Nome completo do motorista.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'input[name="cpf"], [data-onboarding="cpf"]',
          popover: {
            title: 'CPF',
            description: 'CPF do motorista. So numeros.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'button[type="submit"]',
          popover: {
            title: 'Salvar',
            description: 'Salve para cadastrar o motorista.',
            side: 'top',
            align: 'center',
          },
        },
      ],
    },
    // Step 5: Viagens list — show "+ Nova Viagem" button
    {
      page: '/viagens',
      title: 'Suas Viagens',
      description: 'Crie viagens para seus motoristas.',
      highlights: [
        {
          element: 'a[href="/viagens/nova"]',
          popover: {
            title: 'Criar Viagem',
            description:
              'Clique aqui para criar sua primeira viagem. Defina origem, destino e valor do frete.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 6: Viagens nova — highlight form fields
    {
      page: '/viagens/nova',
      title: 'Formulario da Viagem',
      description: 'Preencha os dados da viagem.',
      highlights: [
        {
          element: 'h2',
          popover: {
            title: 'Nova Viagem',
            description:
              'Crie sua primeira viagem. Origem, destino e valor do frete.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-onboarding="origem"], input[name="origem"]',
          popover: {
            title: 'Origem',
            description: 'De onde o caminhao sai. Comece a digitar a cidade.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-onboarding="destino"], input[name="destino"]',
          popover: {
            title: 'Destino',
            description: 'Para onde vai. Comece a digitar.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-onboarding="valor-frete"], input[name="valor_frete"]',
          popover: {
            title: 'Valor do Frete',
            description: 'Valor total do frete combinado.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'button[type="submit"]',
          popover: {
            title: 'Salvar',
            description: 'Salve para criar a viagem.',
            side: 'top',
            align: 'center',
          },
        },
      ],
    },
    // Step 7: Fechamentos — highlight "Viagens Prontas para Acerto"
    {
      page: '/fechamentos',
      title: 'Acerto de Contas',
      description: 'Faca o acerto com seus motoristas.',
      highlights: [
        {
          element: 'h2',
          popover: {
            title: 'Acerto de Contas',
            description:
              'Aqui voce faz o acerto de contas com cada motorista apos as viagens.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: 'a[href="/fechamentos/novo"], [data-onboarding="fechamento-novo"]',
          popover: {
            title: 'Viagens Prontas para Acerto',
            description:
              'Quando as viagens forem concluidas, voce faz o acerto financeiro aqui.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 8: BI — highlight KPI cards
    {
      page: '/bi',
      title: 'Resumo dos Gastos',
      description: 'Acompanhe o resultado da sua frota.',
      highlights: [
        {
          element: '[data-onboarding="bi-kpis"], .grid',
          popover: {
            title: 'Resultado da Frota',
            description:
              'Esses numeros mostram o resultado real da sua frota. Receita, gastos e margem. Conforme suas viagens forem registradas, esses numeros vao sendo preenchidos.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 9: Conclusion overlay
    {
      page: '/dashboard',
      title: 'Parabens!',
      description: 'Sua frota esta configurada.',
      overlay: true,
      highlights: [],
    },
  ];
}

/**
 * MOTORISTA onboarding: 8 steps (0-7), focused on daily operations.
 * Guides the driver through viewing trips and recording expenses.
 */
export function getMotoristaStepDefs(): OnboardingStepDef[] {
  return [
    // Step 0: Welcome overlay
    {
      page: '/dashboard',
      title: 'Bem-vindo ao FrotaViva!',
      description: 'Voce e fundamental para a frota.',
      overlay: true,
      highlights: [],
    },
    // Step 1: Viagens list — show trip list and explain statuses
    {
      page: '/viagens',
      title: 'Suas Viagens',
      description: 'Veja suas viagens e seus status.',
      highlights: [
        {
          element: '[data-onboarding="viagens-lista"], .space-y-4, main > div',
          popover: {
            title: 'Lista de Viagens',
            description:
              'Aqui aparecem todas as suas viagens. As viagens em andamento ficam no topo. Os status sao: Planejada, Em Andamento e Concluida.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 2: Viagens — explain "Ver" button on a viagem card
    {
      page: '/viagens',
      title: 'Detalhes da Viagem',
      description: 'Veja os detalhes de cada viagem.',
      highlights: [
        {
          element: 'a[href^="/viagens/"], [data-onboarding="viagem-ver"]',
          popover: {
            title: 'Ver Viagem',
            description:
              'Clique em "Ver" para abrir os detalhes da viagem. La dentro voce registra abastecimentos e despesas.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 3: Explain abastecimento (contextual, on viagens page)
    {
      page: '/viagens',
      title: 'Registrar Abastecimento',
      description: 'Dentro da viagem, registre abastecimentos.',
      highlights: [
        {
          popover: {
            title: 'Registrar Abastecimento',
            description:
              'Dentro da viagem, use o botao "Registrar Abastecimento" toda vez que abastecer. Informe litros, posto, valor e km do painel.',
          },
        },
      ],
    },
    // Step 4: Explain despesa (contextual, on viagens page)
    {
      page: '/viagens',
      title: 'Registrar Despesa',
      description: 'Registre pedagio, alimentacao e outros gastos.',
      highlights: [
        {
          popover: {
            title: 'Registrar Despesa',
            description:
              'Use "Registrar Despesa" para pedagio, alimentacao, borracheiro e outros gastos da viagem.',
          },
        },
      ],
    },
    // Step 5: Explain comprovante (contextual)
    {
      page: '/viagens',
      title: 'Anexar Comprovante',
      description: 'Tire foto da nota e anexe.',
      highlights: [
        {
          popover: {
            title: 'Anexar Comprovante',
            description:
              'Apos registrar um gasto, anexe o comprovante (foto da nota). Isso e importante para a prestacao de contas com o patrao.',
          },
        },
      ],
    },
    // Step 6: Dashboard — highlight earnings card
    {
      page: '/dashboard',
      title: 'Seus Ganhos',
      description: 'Veja quanto voce ganhou no mes.',
      highlights: [
        {
          element: '[data-onboarding="ganhos"], .grid, main > div > div:first-child',
          popover: {
            title: 'Seus Ganhos',
            description:
              'Aqui voce acompanha seus ganhos do mes. O valor atualiza conforme as viagens sao concluidas e os acertos feitos.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    },
    // Step 7: Conclusion overlay
    {
      page: '/dashboard',
      title: 'Pronto!',
      description: 'Bom trabalho na estrada!',
      overlay: true,
      highlights: [],
    },
  ];
}

/**
 * Returns the step definitions for a given role.
 */
export function getStepDefs(role: 'dono' | 'motorista'): OnboardingStepDef[] {
  return role === 'motorista' ? getMotoristaStepDefs() : getDonoStepDefs();
}

/**
 * Returns total number of steps for a given role.
 */
export function getTotalSteps(role: 'dono' | 'motorista'): number {
  return getStepDefs(role).length;
}
