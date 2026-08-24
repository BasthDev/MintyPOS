import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { ClipboardList } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OrdersScreen() {
  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Orders Management</Text>
      <Text style={styles.subtitle}>View and manage customer orders</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Today's Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>Rp 0</Text>
          <Text style={styles.statLabel}>Today's Revenue</Text>
        </View>
      </View>
    </View>
  );

  const rightPanel = (
    <View style={styles.ordersList}>
      <Text style={styles.listTitle}>Recent Orders</Text>
      <View style={styles.emptyState}>
        <ClipboardList size={48} color="#888" />
        <Text style={styles.emptyText}>No orders yet</Text>
        <Text style={styles.emptySubtext}>Orders will appear here after checkout</Text>
      </View>
    </View>
  );

  return (
    <>
      <Header title="Orders" />
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
  ordersList: {
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