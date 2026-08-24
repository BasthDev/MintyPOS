import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { BarChart3 } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ReportsScreen() {
  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Reports & Analytics</Text>
      <Text style={styles.subtitle}>View business performance metrics</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>Rp 0</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
      </View>

      <View style={styles.reportTypes}>
        <Text style={styles.sectionTitle}>Available Reports</Text>
        <View style={styles.reportItem}>
          <Text style={styles.reportName}>Sales Report</Text>
          <Text style={styles.reportDesc}>Daily, weekly, monthly sales</Text>
        </View>
        <View style={styles.reportItem}>
          <Text style={styles.reportName}>Inventory Report</Text>
          <Text style={styles.reportDesc}>Stock levels and movements</Text>
        </View>
        <View style={styles.reportItem}>
          <Text style={styles.reportName}>Profit Report</Text>
          <Text style={styles.reportDesc}>Margins and COGS analysis</Text>
        </View>
      </View>
    </View>
  );

  const rightPanel = (
    <View style={styles.reportsPanel}>
      <Text style={styles.listTitle}>Report Preview</Text>
      <View style={styles.emptyState}>
        <BarChart3 size={48} color="#888" />
        <Text style={styles.emptyText}>Select a report type</Text>
        <Text style={styles.emptySubtext}>Choose a report from the left panel</Text>
      </View>
    </View>
  );

  return (
    <>
      <Header title="Reports" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  reportTypes: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reportItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 12,
  },
  reportsPanel: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
});