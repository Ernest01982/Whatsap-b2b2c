import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceLabel: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#10b981',
    marginBottom: 4,
  },
  invoiceId: {
    fontSize: 10,
    color: '#64748b',
  },
  invoiceDate: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  clientDetail: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#475569',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableText: {
    fontSize: 10,
    color: '#334155',
  },
  summaryContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  summaryBox: {
    width: 200,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    marginTop: 4,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  footerText: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
});

interface LineItem {
  id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface InvoiceData {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  amount_paid: number;
  balance_due: number;
  merchant: {
    business_name: string;
  };
  client: {
    name: string;
    phone_number: string;
    email_address: string | null;
  };
  items: LineItem[];
}

interface InvoiceTemplateProps {
  invoice: InvoiceData;
}

const formatCurrency = (amount: number): string => {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const getStatusColor = (status: string): { bg: string; text: string } => {
  switch (status) {
    case 'Paid':
      return { bg: '#dcfce7', text: '#166534' };
    case 'Pending Deposit':
      return { bg: '#fef3c7', text: '#92400e' };
    case 'Pending Final':
      return { bg: '#dbeafe', text: '#1e40af' };
    case 'Cancelled':
      return { bg: '#fee2e2', text: '#991b1b' };
    default:
      return { bg: '#f1f5f9', text: '#475569' };
  }
};

export const InvoiceTemplate = ({ invoice }: InvoiceTemplateProps) => {
  const statusColor = getStatusColor(invoice.status);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{invoice.merchant.business_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>{invoice.status}</Text>
            </View>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceId}>#{invoice.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.invoiceDate}>{formatDate(invoice.created_at)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.clientName}>{invoice.client.name}</Text>
          <Text style={styles.clientDetail}>{invoice.client.phone_number}</Text>
          {invoice.client.email_address && (
            <Text style={styles.clientDetail}>{invoice.client.email_address}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Unit Price</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {invoice.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableText, styles.colDescription]}>{item.service_name}</Text>
                <Text style={[styles.tableText, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableText, styles.colPrice]}>{formatCurrency(item.unit_price)}</Text>
                <Text style={[styles.tableText, styles.colTotal]}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.total_amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Deposit Required</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.deposit_amount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Paid</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.amount_paid)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Balance Due</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.balance_due)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your business. Payment is due upon receipt unless otherwise agreed.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export type { InvoiceData, LineItem };
