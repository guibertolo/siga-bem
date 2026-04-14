import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politica de Privacidade',
  description:
    'Politica de Privacidade do FrotaViva - Gestao de Frotas de Cegonha. Saiba como seus dados sao tratados conforme a LGPD.',
};

/**
 * /privacidade - Pagina publica (acessivel sem login)
 *
 * Conteudo juridico com placeholders [PREENCHER: ...] para o cliente preencher.
 * Publico 55+: fonte minima text-base, linguagem simples, zero jargao.
 */
export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-surface-background px-4 py-8 sm:px-6 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-default border border-surface-border bg-surface-card text-primary-700 no-underline transition-colors hover:bg-surface-hover"
            aria-label="Voltar para a pagina inicial"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo */}
          <img
            src="/logos/frotaviva-logo-icon.svg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">
            Politica de Privacidade
          </h1>
        </div>

        <div className="space-y-8 rounded-card bg-surface-card p-6 shadow-sm sm:p-8">
          {/* Intro */}
          <section>
            <p className="text-base leading-relaxed text-primary-900">
              Esta Politica de Privacidade explica como o FrotaViva coleta, usa e
              protege os dados pessoais dos usuarios da plataforma, em
              conformidade com a Lei Geral de Protecao de Dados Pessoais (LGPD -
              Lei n. 13.709/2018).
            </p>
            <p className="mt-3 text-base leading-relaxed text-text-muted">
              Ultima atualizacao:{' '}
              <span className="font-semibold text-primary-900">
                [PREENCHER: data da ultima revisao juridica]
              </span>
            </p>
          </section>

          {/* 1. Responsavel pelo tratamento */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              1. Quem e o responsavel pelos seus dados
            </h2>
            <div className="rounded-default bg-alert-warning-bg border border-warning/30 p-4">
              <p className="text-base text-primary-900">
                <strong>Razao social:</strong> [PREENCHER: razao social da empresa]
              </p>
              <p className="text-base text-primary-900 mt-2">
                <strong>CNPJ:</strong> [PREENCHER: CNPJ]
              </p>
              <p className="text-base text-primary-900 mt-2">
                <strong>Endereco:</strong> [PREENCHER: endereco completo]
              </p>
            </div>
          </section>

          {/* 2. Dados coletados */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              2. Quais dados coletamos
            </h2>
            <p className="text-base leading-relaxed text-primary-900 mb-4">
              O FrotaViva coleta apenas os dados necessarios para o funcionamento
              do sistema de gestao de frotas:
            </p>
            <ul className="list-disc space-y-3 pl-6 text-base text-primary-900">
              <li>
                <strong>Dados de cadastro:</strong> nome, e-mail, telefone, CPF
                e/ou CNPJ
              </li>
              <li>
                <strong>Dados da empresa:</strong> razao social, CNPJ, endereco da
                transportadora
              </li>
              <li>
                <strong>Dados operacionais:</strong> informacoes de viagens,
                veiculos, motoristas, gastos e fechamentos financeiros
              </li>
              <li>
                <strong>Dados de acesso:</strong> registros de login, endereco IP,
                navegador utilizado
              </li>
              <li>
                <strong>Dados financeiros:</strong> valores de fretes, gastos
                operacionais, acertos com motoristas
              </li>
            </ul>
          </section>

          {/* 3. Finalidade */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              3. Para que usamos seus dados
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-base text-primary-900">
              <li>
                Gerenciar sua conta e acesso ao sistema
              </li>
              <li>
                Processar e registrar viagens, gastos e fechamentos financeiros
              </li>
              <li>
                Gerar relatorios e analises de desempenho da frota
              </li>
              <li>
                Enviar notificacoes importantes sobre o sistema
              </li>
              <li>
                Melhorar o funcionamento e a seguranca da plataforma
              </li>
              <li>
                [PREENCHER: outras finalidades especificas do negocio]
              </li>
            </ul>
          </section>

          {/* 4. Base legal */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              4. Base legal para o tratamento
            </h2>
            <p className="text-base leading-relaxed text-primary-900">
              O tratamento dos seus dados pessoais se baseia nas seguintes
              justificativas previstas na LGPD:
            </p>
            <ul className="mt-3 list-disc space-y-3 pl-6 text-base text-primary-900">
              <li>
                <strong>Execucao de contrato:</strong> para fornecer o servico de
                gestao de frotas contratado
              </li>
              <li>
                <strong>Consentimento:</strong> para dados de uso (analytics) e
                preferencias
              </li>
              <li>
                <strong>Obrigacao legal:</strong> quando exigido por legislacao
                fiscal ou regulatoria
              </li>
              <li>
                [PREENCHER: outras bases legais aplicaveis]
              </li>
            </ul>
          </section>

          {/* 5. Cookies */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              5. Dados armazenados no seu navegador
            </h2>
            <p className="text-base leading-relaxed text-primary-900 mb-4">
              Utilizamos pequenos arquivos para que o sistema funcione
              corretamente e para lembrar suas preferencias:
            </p>
            <div className="space-y-3">
              <div className="rounded-default border border-surface-border p-4">
                <p className="font-semibold text-primary-900 text-base">
                  Essenciais (sempre ativos)
                </p>
                <p className="text-base text-text-muted mt-1">
                  Login, sessao de uso, empresa selecionada. Sem eles, o sistema
                  nao funciona.
                </p>
              </div>
              <div className="rounded-default border border-surface-border p-4">
                <p className="font-semibold text-primary-900 text-base">
                  Dados de uso e erros (com seu consentimento)
                </p>
                <p className="text-base text-text-muted mt-1">
                  Nos ajudam a entender como voce usa o sistema e a corrigir
                  problemas. Inclui Vercel Analytics e monitoramento de erros
                  (Sentry).
                </p>
              </div>
              <div className="rounded-default border border-surface-border p-4">
                <p className="font-semibold text-primary-900 text-base">
                  Preferencias (com seu consentimento)
                </p>
                <p className="text-base text-text-muted mt-1">
                  Lembram suas escolhas, como o tema claro ou escuro.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Retencao */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              6. Por quanto tempo guardamos seus dados
            </h2>
            <div className="rounded-default bg-alert-warning-bg border border-warning/30 p-4">
              <p className="text-base text-primary-900">
                [PREENCHER: definir prazo de retencao para cada categoria de dado.
                Exemplo: dados cadastrais - enquanto a conta estiver ativa + 5
                anos apos exclusao; dados financeiros - conforme legislacao fiscal
                vigente; dados de acesso - 6 meses]
              </p>
            </div>
          </section>

          {/* 7. Direitos do titular */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              7. Seus direitos
            </h2>
            <p className="text-base leading-relaxed text-primary-900 mb-4">
              Conforme a LGPD, voce tem direito a:
            </p>
            <ul className="list-disc space-y-3 pl-6 text-base text-primary-900">
              <li>Saber quais dados temos sobre voce</li>
              <li>Corrigir dados incorretos ou desatualizados</li>
              <li>Pedir a exclusão dos seus dados</li>
              <li>Revogar seu consentimento a qualquer momento</li>
              <li>Pedir a transferencia dos seus dados para outro servico</li>
              <li>Obter informacao sobre com quem seus dados foram compartilhados</li>
            </ul>
            <p className="mt-4 text-base leading-relaxed text-primary-900">
              Para exercer qualquer desses direitos, entre em contato pelo canal
              indicado abaixo.
            </p>
          </section>

          {/* 8. Contato do encarregado (DPO) */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              8. Contato do encarregado de dados (DPO)
            </h2>
            <div className="rounded-default bg-alert-warning-bg border border-warning/30 p-4">
              <p className="text-base text-primary-900">
                <strong>Nome:</strong> [PREENCHER: nome do encarregado/DPO]
              </p>
              <p className="text-base text-primary-900 mt-2">
                <strong>E-mail:</strong> [PREENCHER: e-mail de contato para
                questoes de privacidade]
              </p>
              <p className="text-base text-primary-900 mt-2">
                <strong>Telefone:</strong> [PREENCHER: telefone de contato]
              </p>
            </div>
          </section>

          {/* 9. Alteracoes */}
          <section>
            <h2 className="mb-3 text-xl font-bold text-primary-900">
              9. Alteracoes nesta politica
            </h2>
            <p className="text-base leading-relaxed text-primary-900">
              Esta politica pode ser atualizada periodicamente. Quando isso
              acontecer, voce sera informado pelo sistema. A data da ultima
              atualizacao estara sempre no topo desta pagina.
            </p>
          </section>
        </div>

        {/* Footer link back */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center justify-center rounded-default border border-surface-border bg-surface-card px-6 py-3 text-base font-semibold text-primary-700 no-underline transition-colors hover:bg-surface-hover"
          >
            Voltar para o FrotaViva
          </Link>
        </div>
      </div>
    </main>
  );
}
