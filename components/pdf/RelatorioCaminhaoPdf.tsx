import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { RelatorioCaminhaoResult } from '@/types/relatorios';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  // Header
  headerContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 12,
  },
  empresaNome: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  tipoRelatorio: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 4,
  },
  caminhaoNome: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  periodo: {
    fontSize: 9,
    color: '#444444',
  },
  // Summary grid
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666666',
  },
  // Custos section
  custosContainer: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  custosTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  custosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  custosLabel: {
    fontSize: 9,
    color: '#555555',
  },
  custosValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  custosTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    marginTop: 4,
  },
  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 8,
  },
  // Column widths for caminhao
  colData: { width: '13%' },
  colOrigem: { width: '18%' },
  colDestino: { width: '18%' },
  colKm: { width: '10%', textAlign: 'right' },
  colValor: { width: '15%', textAlign: 'right' },
  colMotorista: { width: '16%' },
  colStatus: { width: '10%' },
  // Totals
  totalsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  totalsText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Signature
  signatureContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  signatureBlock: {
    width: '50%',
    alignItems: 'center',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    width: '100%',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#444444',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999999',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 4,
  },
});

function formatDateBR(isoString: string | null): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatBRL(centavos: number): string {
  return `R$ ${(centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatKm(km: number | null): string {
  if (km == null) return '-';
  return km.toLocaleString('pt-BR');
}

function formatMargem(margem: number | null): string {
  if (margem == null) return '-';
  const sinal = margem >= 0 ? '+' : '';
  return `${sinal}${margem.toFixed(1)}%`;
}

function formatNow(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

interface RelatorioCaminhaoPdfProps {
  data: RelatorioCaminhaoResult;
}

export function RelatorioCaminhaoPdf({ data }: RelatorioCaminhaoPdfProps) {
  const { header, viagens, custos_diretos } = data;
  const geradoEm = formatNow();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.empresaNome}>{header.empresa_nome}</Text>
          <Text style={styles.tipoRelatorio}>Relatorio de Caminhao</Text>
          <Text style={styles.caminhaoNome}>
            {header.caminhao_placa} - {header.caminhao_modelo}
          </Text>
          <Text style={styles.periodo}>
            Periodo: {formatDateBR(header.periodo_inicio)} a{' '}
            {formatDateBR(header.periodo_fim)}
          </Text>
        </View>

        {/* Summary KPIs - Row 1 */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{header.total_viagens}</Text>
            <Text style={styles.summaryLabel}>Viagens</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{formatKm(header.km_total_calculado)} km</Text>
            <Text style={styles.summaryLabel}>KM Total</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>
              {formatBRL(header.receita_total_centavos)}
            </Text>
            <Text style={styles.summaryLabel}>Receita</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>
              {formatMargem(header.margem_percentual)}
            </Text>
            <Text style={styles.summaryLabel}>Margem</Text>
          </View>
        </View>

        {/* Custos diretos card */}
        <View style={styles.custosContainer}>
          <Text style={styles.custosTitle}>Custos Diretos</Text>
          <View style={styles.custosRow}>
            <Text style={styles.custosLabel}>Combustível</Text>
            <Text style={styles.custosValue}>
              {formatBRL(custos_diretos.combustivel_centavos)}
            </Text>
          </View>
          <View style={styles.custosRow}>
            <Text style={styles.custosLabel}>Manutenção</Text>
            <Text style={styles.custosValue}>
              {formatBRL(custos_diretos.manutencao_centavos)}
            </Text>
          </View>
          <View style={styles.custosRow}>
            <Text style={styles.custosLabel}>Pedagio</Text>
            <Text style={styles.custosValue}>
              {formatBRL(custos_diretos.pedagio_centavos)}
            </Text>
          </View>
          <View style={styles.custosTotalRow}>
            <Text style={[styles.custosLabel, { fontFamily: 'Helvetica-Bold' }]}>Total</Text>
            <Text style={styles.custosValue}>
              {formatBRL(header.custo_total_centavos)}
            </Text>
          </View>
        </View>

        {/* Documentation section: CRLV + IPVA */}
        <View style={styles.custosContainer}>
          <Text style={styles.custosTitle}>Documentacao</Text>
          <View style={styles.custosRow}>
            <Text style={styles.custosLabel}>CRLV</Text>
            <Text style={styles.custosValue}>
              {header.doc_vencimento
                ? `Vence: ${formatDateBR(header.doc_vencimento)} (${
                    header.doc_status === 'ok'
                      ? 'Em dia'
                      : header.doc_status === 'vencendo'
                        ? 'Vencendo'
                        : header.doc_status === 'vencido'
                          ? 'VENCIDO'
                          : '-'
                  })`
                : 'Nao informado'}
            </Text>
          </View>
          <View style={styles.custosRow}>
            <Text style={styles.custosLabel}>IPVA</Text>
            <Text style={styles.custosValue}>
              {header.ipva_ano_referencia
                ? `${header.ipva_pago ? 'Pago' : 'Pendente'}${
                    header.ipva_valor_centavos != null
                      ? ` - ${formatBRL(header.ipva_valor_centavos)}`
                      : ''
                  } (${header.ipva_ano_referencia})`
                : 'Nao informado'}
            </Text>
          </View>
        </View>

        {/* Trips table */}
        <Text style={styles.sectionTitle}>
          Viagens ({viagens.length})
        </Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colData]}>Data</Text>
          <Text style={[styles.tableHeaderText, styles.colOrigem]}>Origem</Text>
          <Text style={[styles.tableHeaderText, styles.colDestino]}>Destino</Text>
          <Text style={[styles.tableHeaderText, styles.colKm]}>KM</Text>
          <Text style={[styles.tableHeaderText, styles.colValor]}>Valor Frete</Text>
          <Text style={[styles.tableHeaderText, styles.colMotorista]}>Motorista</Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
        </View>
        {viagens.map((v, idx) => (
          <View
            key={v.id}
            style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            wrap={false}
          >
            <Text style={[styles.tableCell, styles.colData]}>
              {formatDateBR(v.data_saida)}
            </Text>
            <Text style={[styles.tableCell, styles.colOrigem]}>{v.origem}</Text>
            <Text style={[styles.tableCell, styles.colDestino]}>{v.destino}</Text>
            <Text style={[styles.tableCell, styles.colKm]}>{formatKm(v.km_calculado)}</Text>
            <Text style={[styles.tableCell, styles.colValor]}>
              {formatBRL(v.valor_total_centavos)}
            </Text>
            <Text style={[styles.tableCell, styles.colMotorista]}>{v.motorista_nome}</Text>
            <Text style={[styles.tableCell, styles.colStatus]}>{v.status}</Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={styles.totalsContainer}>
          <Text style={[styles.totalsText, styles.colData]}>TOTAL</Text>
          <Text style={[styles.totalsText, styles.colOrigem]} />
          <Text style={[styles.totalsText, styles.colDestino]} />
          <Text style={[styles.totalsText, styles.colKm]}>
            {formatKm(header.km_total_calculado)}
          </Text>
          <Text style={[styles.totalsText, styles.colValor]}>
            {formatBRL(header.receita_total_centavos)}
          </Text>
          <Text style={[styles.totalsText, styles.colMotorista]} />
          <Text style={[styles.totalsText, styles.colStatus]} />
        </View>

        {/* Signature area - only Dono for caminhao */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Dono: ___________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Gerado em {geradoEm}</Text>
          <Text>FrotaViva - frotaviva.com.br</Text>
        </View>
      </Page>
    </Document>
  );
}
