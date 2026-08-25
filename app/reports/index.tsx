import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { BarChart3 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportsScreen() {
  const { theme } = useTheme();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', desc: 'Daily, weekly, monthly sales breakdown' },
    { id: 'inventory', name: 'Inventory Report', desc: 'Stock levels, movements, and usage' },
    { id: 'profit', name: 'Profit & Margin Report', desc: 'Margins, COGS analysis, and profit' },
  ];

  // --- LEFT PANEL (Main Screen) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Reports & Analytics</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        View business performance metrics
      </Text>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: theme.primary }]}>Rp 0</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Revenue</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>0</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Orders</Text>
        </View>
      </View>

      <View style={styles.reportTypes}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Reports</Text>
        {reportTypes.map((report) => {
          const isSelected = selectedReport === report.id;
          return (
            <TouchableOpacity
              key={report.id}
              activeOpacity={0.7}
              style={[
                styles.reportItem,
                {
                  backgroundColor: isSelected ? theme.primary : theme.card,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedReport(report.id)}
            >
              <Text
                style={[
                  styles.reportName,
                  { color: isSelected ? '#FFFFFF' : theme.text },
                ]}
              >
                {report.name}
              </Text>
              <Text
                style={[
                  styles.reportDesc,
                  { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                ]}
              >
                {report.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // --- RIGHT PANEL (Report Details Preview) ---
  const currentReportObj = reportTypes.find((r) => r.id === selectedReport);

  const rightPanel = selectedReport ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <BarChart3 size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>{currentReportObj?.name}</Text>
            <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              {currentReportObj?.desc}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Report Insights</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Report data and visual charts will be rendered here as transaction history builds up.
          </Text>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <BarChart3 size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Report Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a report type from the list to preview metrics and analytics.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Reports" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedReport}
        onBack={() => setSelectedReport(null)}
        backButtonTitle="Back to Reports"
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  reportTypes: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  reportItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  reportDesc: {
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailsIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsHeaderMeta: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  detailsScroll: {
    flex: 1,
    marginTop: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
  },
  emptyDetailsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDetailsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});