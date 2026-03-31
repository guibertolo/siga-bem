/**
 * PDF Document component for Fechamento financial report.
 * Story 4.2 — Relatorio e Impressao de Fechamento (PDF)
 *
 * Uses @react-pdf/renderer for A4 portrait layout.
 * Must be loaded with dynamic import (ssr: false) — client-only.
 * DO NOT add 'use client' here — this file is loaded exclusively via
 * dynamic import() in use-fechamento-pdf.ts to keep @react-pdf/renderer
 * out of the automatic client bundle (~1.49 MB savings).
 *
 * LGPD (AC5): CPF is masked via mascararCpf from @/lib/utils/lgpd
 * Watermark (AC6): "PAGO" diagonal watermark when status === 'pago'
 * Values (CON-003): All monetary values are centavos, formatted via formatBRL
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { FechamentoCompleto } from '@/types/fechamento';
import { mascararCpf } from '@/lib/utils/lgpd';
import { formatBRL } from '@/lib/utils/currency';
import { formatarData } from '@/lib/utils/format-date';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1B3A4B',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B3A4B',
  },
  companyCnpj: {
    fontSize: 10,
    color: '#2C5F7C',
    marginTop: 4,
  },
  generatedAt: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1B3A4B',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 120,
    color: '#334155',
  },
  infoValue: {
    fontSize: 10,
    color: '#0F172A',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginTop: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#334155',
  },
  summaryValue: {
    fontSize: 11,
    color: '#0F172A',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  saldoPositivo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B7A3D',
  },
  saldoNegativo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B91C1C',
  },
  saldoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B3A4B',
  },
  // Table styles
  table: {
    width: '100%',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1B3A4B',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  tableCellRight: {
    fontSize: 9,
    color: '#334155',
    textAlign: 'right',
  },
  // Column widths for viagens table
  colViagemData: { width: '15%' },
  colViagemRota: { width: '35%' },
  colViagemValor: { width: '18%' },
  colViagemPerc: { width: '14%' },
  colViagemMotorista: { width: '18%' },
  // Column widths for gastos table
  colGastoData: { width: '18%' },
  colGastoCategoria: { width: '22%' },
  colGastoDescricao: { width: '40%' },
  colGastoValor: { width: '20%' },
  // Subtotal row
  subtotalRow: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#EEF2FF',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  subtotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1B3A4B',
  },
  subtotalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1B3A4B',
    textAlign: 'right',
  },
  // Watermark
  watermark: {
    position: 'absolute',
    top: 300,
    left: 80,
    opacity: 0.15,
    fontSize: 80,
    fontWeight: 'bold',
    color: '#B91C1C',
    transform: 'rotate(-45deg)',
  },
  // Footer / signatures
  footer: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: 200,
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#1B3A4B',
    paddingTop: 4,
    marginTop: 40,
    width: 200,
    alignItems: 'center',
  },
  signatureName: {
    fontSize: 9,
    color: '#0F172A',
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  signatureCpf: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
  // Empty state
  emptyRow: {
    padding: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 9,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FechamentoPDFProps {
  fechamento: FechamentoCompleto;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTipoLabel(tipo: string): string {
  return tipo === 'mensal' ? 'Mensal' : 'Semanal';
}

function formatPercentual(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FechamentoPDFDocument({ fechamento }: FechamentoPDFProps) {
  const { motorista, empresa, viagens, gastos, totais } = fechamento;
  const isPago = fechamento.status === 'pago';
  const cpfMascarado = mascararCpf(motorista.cpf);
  const nomeEmpresa = empresa.nome_fantasia || empresa.razao_social;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* AC6: Watermark PAGO */}
        {isPago && <Text style={styles.watermark}>PAGO</Text>}

        {/* === HEADER === */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{nomeEmpresa}</Text>
          <Text style={styles.companyCnpj}>CNPJ: {empresa.cnpj}</Text>
          <Text style={styles.generatedAt}>
            Gerado em: {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>

        {/* === IDENTIFICATION === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerto de Contas</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Motorista:</Text>
            <Text style={styles.infoValue}>{motorista.nome}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{cpfMascarado}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Período:</Text>
            <Text style={styles.infoValue}>
              {formatarData(fechamento.periodo_inicio)} a{' '}
              {formatarData(fechamento.periodo_fim)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>
              {formatTipoLabel(fechamento.tipo)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID Fechamento:</Text>
            <Text style={styles.infoValue}>
              {fechamento.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* === FINANCIAL SUMMARY === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Viagens</Text>
              <Text style={styles.summaryValue}>
                {formatBRL(totais.total_viagens)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Gastos</Text>
              <Text style={styles.summaryValue}>
                ({formatBRL(totais.total_gastos)})
              </Text>
            </View>
            <View style={styles.summaryTotal}>
              <Text style={styles.saldoLabel}>Valor a Pagar ao Motorista</Text>
              <Text
                style={
                  totais.saldo >= 0
                    ? styles.saldoPositivo
                    : styles.saldoNegativo
                }
              >
                {formatBRL(totais.saldo)}
              </Text>
            </View>
          </View>
        </View>

        {/* === VIAGENS TABLE === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detalhamento de Viagens ({viagens.length})
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colViagemData]}>
                Data
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colViagemRota]}>
                Rota
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colViagemValor]}>
                Valor Total
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colViagemPerc]}>
                % do Motorista
              </Text>
              <Text
                style={[styles.tableHeaderCell, styles.colViagemMotorista]}
              >
                Motorista
              </Text>
            </View>
            {viagens.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  Nenhuma viagem no periodo
                </Text>
              </View>
            ) : (
              viagens.map((item, index) => (
                <View
                  key={item.id}
                  style={
                    index % 2 === 0 ? styles.tableRow : styles.tableRowAlt
                  }
                >
                  <Text style={[styles.tableCell, styles.colViagemData]}>
                    {item.viagem
                      ? formatarData(item.viagem.data_saida)
                      : '-'}
                  </Text>
                  <Text style={[styles.tableCell, styles.colViagemRota]}>
                    {item.viagem
                      ? `${item.viagem.origem} > ${item.viagem.destino}`
                      : item.descricao ?? '-'}
                  </Text>
                  <Text
                    style={[styles.tableCellRight, styles.colViagemValor]}
                  >
                    {item.viagem
                      ? formatBRL(item.viagem.valor_total)
                      : '-'}
                  </Text>
                  <Text style={[styles.tableCellRight, styles.colViagemPerc]}>
                    {item.viagem
                      ? formatPercentual(item.viagem.percentual_pagamento)
                      : '-'}
                  </Text>
                  <Text
                    style={[
                      styles.tableCellRight,
                      styles.colViagemMotorista,
                    ]}
                  >
                    {formatBRL(item.valor)}
                  </Text>
                </View>
              ))
            )}
            {viagens.length > 0 && (
              <View style={styles.subtotalRow}>
                <Text
                  style={[
                    styles.subtotalLabel,
                    { width: '82%' },
                  ]}
                >
                  Subtotal Viagens
                </Text>
                <Text
                  style={[
                    styles.subtotalValue,
                    { width: '18%' },
                  ]}
                >
                  {formatBRL(totais.total_viagens)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* === GASTOS TABLE === */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detalhamento de Gastos ({gastos.length})
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colGastoData]}>
                Data
              </Text>
              <Text
                style={[styles.tableHeaderCell, styles.colGastoCategoria]}
              >
                Categoria
              </Text>
              <Text
                style={[styles.tableHeaderCell, styles.colGastoDescricao]}
              >
                Descrição
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colGastoValor]}>
                Valor
              </Text>
            </View>
            {gastos.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  Nenhum gasto no período
                </Text>
              </View>
            ) : (
              gastos.map((item, index) => (
                <View
                  key={item.id}
                  style={
                    index % 2 === 0 ? styles.tableRow : styles.tableRowAlt
                  }
                >
                  <Text style={[styles.tableCell, styles.colGastoData]}>
                    {item.gasto ? formatarData(item.gasto.data) : '-'}
                  </Text>
                  <Text
                    style={[styles.tableCell, styles.colGastoCategoria]}
                  >
                    {item.gasto?.categoria_gasto?.nome ?? '-'}
                  </Text>
                  <Text
                    style={[styles.tableCell, styles.colGastoDescricao]}
                  >
                    {item.gasto?.descricao ?? item.descricao ?? '-'}
                  </Text>
                  <Text
                    style={[styles.tableCellRight, styles.colGastoValor]}
                  >
                    {formatBRL(item.valor)}
                  </Text>
                </View>
              ))
            )}
            {gastos.length > 0 && (
              <View style={styles.subtotalRow}>
                <Text
                  style={[
                    styles.subtotalLabel,
                    { width: '80%' },
                  ]}
                >
                  Subtotal Gastos
                </Text>
                <Text
                  style={[
                    styles.subtotalValue,
                    { width: '20%' },
                  ]}
                >
                  {formatBRL(totais.total_gastos)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* === FOOTER / SIGNATURES === */}
        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>{motorista.nome}</Text>
              <Text style={styles.signatureRole}>Motorista</Text>
              <Text style={styles.signatureCpf}>CPF: {cpfMascarado}</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureName}>
                {empresa.razao_social}
              </Text>
              <Text style={styles.signatureRole}>Empresa</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
