import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { RelatorioMotoristaResult } from '@/types/relatorios';

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
  motoristaNome: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  cpfPeriodo: {
    fontSize: 9,
    color: '#444444',
  },
  // Summary grid
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  // Column widths
  colData: { width: '12%' },
  colOrigem: { width: '16%' },
  colDestino: { width: '16%' },
  colKm: { width: '10%', textAlign: 'right' },
  colValor: { width: '14%', textAlign: 'right' },
  colComissao: { width: '14%', textAlign: 'right' },
  colStatus: { width: '10%' },
  colPlaca: { width: '8%' },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '42%',
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
  // Chamada page
  chamadaTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  chamadaSubtitle: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 12,
  },
  chamadaImage: {
    maxWidth: '100%',
    maxHeight: 680,
    objectFit: 'contain',
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

function formatNow(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

interface RelatorioMotoristaPdfProps {
  data: RelatorioMotoristaResult;
}

export function RelatorioMotoristaPdf({ data }: RelatorioMotoristaPdfProps) {
  const { header, viagens } = data;
  const geradoEm = formatNow();

  // Collect comprovantes with signed URLs for chamada pages
  const comprovantesComUrl = viagens.flatMap((v) =>
    (v.comprovantes ?? [])
      .filter((c) => c.url_signed)
      .map((c) => ({
        url: c.url_signed!,
        viagemOrigem: v.origem,
        viagemDestino: v.destino,
        viagemData: v.data_saida,
      })),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.empresaNome}>{header.empresa_nome}</Text>
          <Text style={styles.tipoRelatorio}>Relatorio de Motorista</Text>
          <Text style={styles.motoristaNome}>{header.motorista_nome}</Text>
          <Text style={styles.cpfPeriodo}>
            CPF: {header.motorista_cpf} | Periodo: {formatDateBR(header.periodo_inicio)} a{' '}
            {formatDateBR(header.periodo_fim)}
          </Text>
        </View>

        {/* Summary KPIs */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{header.total_viagens}</Text>
            <Text style={styles.summaryLabel}>Viagens</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{formatKm(header.total_km_calculado)} km</Text>
            <Text style={styles.summaryLabel}>KM Total</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>
              {formatBRL(header.total_valor_bruto_centavos)}
            </Text>
            <Text style={styles.summaryLabel}>Valor Bruto</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>
              {formatBRL(header.total_pagamento_centavos)}
            </Text>
            <Text style={styles.summaryLabel}>Pagamento</Text>
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
          <Text style={[styles.tableHeaderText, styles.colComissao]}>Comissao</Text>
          <Text style={[styles.tableHeaderText, styles.colStatus]}>Status</Text>
          <Text style={[styles.tableHeaderText, styles.colPlaca]}>Placa</Text>
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
            <Text style={[styles.tableCell, styles.colComissao]}>
              {formatBRL(v.pagamento_centavos)} ({v.percentual_pagamento}%)
            </Text>
            <Text style={[styles.tableCell, styles.colStatus]}>{v.status}</Text>
            <Text style={[styles.tableCell, styles.colPlaca]}>{v.caminhao_placa}</Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={styles.totalsContainer}>
          <Text style={[styles.totalsText, styles.colData]}>TOTAL</Text>
          <Text style={[styles.totalsText, styles.colOrigem]} />
          <Text style={[styles.totalsText, styles.colDestino]} />
          <Text style={[styles.totalsText, styles.colKm]}>
            {formatKm(header.total_km_calculado)}
          </Text>
          <Text style={[styles.totalsText, styles.colValor]}>
            {formatBRL(header.total_valor_bruto_centavos)}
          </Text>
          <Text style={[styles.totalsText, styles.colComissao]}>
            {formatBRL(header.total_pagamento_centavos)}
          </Text>
          <Text style={[styles.totalsText, styles.colStatus]} />
          <Text style={[styles.totalsText, styles.colPlaca]} />
        </View>

        {/* Signature area */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Dono: ___________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Motorista: ___________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Gerado em {geradoEm}</Text>
          <Text>FrotaViva - frotaviva.com.br</Text>
        </View>
      </Page>

      {/* Chamada pages (one per comprovante with signed URL) */}
      {comprovantesComUrl.map((comp, idx) => (
        <Page key={`chamada-${idx}`} size="A4" style={styles.page}>
          <Text style={styles.chamadaTitle}>ANEXO - Chamada Fotografada</Text>
          <Text style={styles.chamadaSubtitle}>
            Viagem: {comp.viagemOrigem} &rarr; {comp.viagemDestino} |{' '}
            {formatDateBR(comp.viagemData)}
          </Text>
          <Image src={comp.url} style={styles.chamadaImage} />
          <View style={styles.footer} fixed>
            <Text>Gerado em {geradoEm}</Text>
            <Text>FrotaViva - frotaviva.com.br</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
