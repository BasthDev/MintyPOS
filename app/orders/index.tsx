import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { ClipboardList } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function OrdersScreen() {
  const { theme } = useTheme();

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter((o) =>
    o.id?.toString().includes(search) || o.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  // --- LEFT PANEL (Main Screen: Orders List + Search) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search orders..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <ClipboardList size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No orders yet</Text>
          <Text style={[styles.emptyListSubtext, { color: theme.textSecondary }]}>
            Completed transactions will appear here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredOrders.map((o) => {
            const isSelected = selectedOrder?.id === o.id;

            return (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.7}
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedOrder(o)}
              >
                <View style={styles.cardMain}>
                  <View style={styles.cardHeaderInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      Order #{o.id}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubText,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                    >
                      {o.itemsCount || 0} items • {o.date || 'Today'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.cardPrice,
                      { color: isSelected ? '#FFFFFF' : theme.primary },
                    ]}
                  >
                    Rp {o.total ? o.total.toLocaleString() : '0'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // --- RIGHT PANEL (Order Details) ---
  const rightPanel = selectedOrder ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <ClipboardList size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>Order #{selectedOrder.id}</Text>
            <Text style={[styles.detailsPrice, { color: theme.primary }]}>
              Rp {selectedOrder.total ? selectedOrder.total.toLocaleString() : '0'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Order Summary</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Order ID:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>#{selectedOrder.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Date:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedOrder.date || 'Today'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Amount:</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              Rp {selectedOrder.total ? selectedOrder.total.toLocaleString() : '0'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <ClipboardList size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Order Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select an order from the list to view its complete receipt and summary details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Orders" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedOrder}
        onBack={() => setSelectedOrder(null)}
        backButtonTitle="Back to Orders"
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
  },
  searchBar: {
    marginBottom: 12,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyListSubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubText: {
    fontSize: 12,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '700',
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
  detailsPrice: {
    fontSize: 16,
    fontWeight: '700',
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
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
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