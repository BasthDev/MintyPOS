import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { CompletedOrder, OrderSplitItem, dbOperations, getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import {
  ChevronRight,
  ClipboardList,
  Receipt,
  User,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function OrdersScreen() {
  const { theme } = useTheme();

  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
  const [selectedOrderSplits, setSelectedOrderSplits] = useState<OrderSplitItem[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const orderList = await dbOperations.getAllOrders(db);
      setOrders(orderList);

      if (selectedOrder) {
        const updated = orderList.find((o) => o.id === selectedOrder.id);
        setSelectedOrder(updated || null);
        if (updated?.is_split) {
          loadSplits(updated.id);
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSplits = async (orderId: number) => {
    setLoadingSplits(true);
    try {
      const db = await getDatabase();
      const splits = await dbOperations.getOrderSplits(db, orderId);
      setSelectedOrderSplits(splits);
    } catch (err) {
      console.error('Failed to load order splits:', err);
      setSelectedOrderSplits([]);
    } finally {
      setLoadingSplits(false);
    }
  };

  const handleSelectOrder = (order: CompletedOrder) => {
    setSelectedOrder(order);
    if (order.is_split) {
      loadSplits(order.id);
    } else {
      setSelectedOrderSplits([]);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.payment_method?.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      o.id?.toString().includes(search)
  );

  // --- LEFT PANEL (Main Screen: Orders List + Search) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search by order #, customer, payment..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <ClipboardList size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No orders recorded</Text>
          <Text style={[styles.emptyListSubtext, { color: theme.textSecondary }]}>
            {search ? 'No orders matched your search' : 'Completed POS checkouts will appear here'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
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
                onPress={() => handleSelectOrder(o)}
              >
                <View style={styles.cardMain}>
                  <View style={styles.cardHeaderInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.cardName,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        Order #{o.order_number || o.id}
                      </Text>
                      {!!o.is_split && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            backgroundColor: isSelected ? '#FFFFFF30' : theme.primary + '20',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Users size={10} color={isSelected ? '#FFFFFF' : theme.primary} />
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: isSelected ? '#FFFFFF' : theme.primary,
                            }}
                          >
                            SPLIT
                          </Text>
                        </View>
                      )}
                    </View>

                    {o.customer_name ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <User size={12} color={isSelected ? '#E0F2FE' : theme.primary} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: isSelected ? '#E0F2FE' : theme.primary,
                          }}
                        >
                          {o.customer_name}
                        </Text>
                      </View>
                    ) : null}

                    <Text
                      style={[
                        styles.cardSubText,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                    >
                      {o.items_count || o.items?.length || 0} items •{' '}
                      {o.payment_method?.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.cardDateText,
                        { color: isSelected ? '#CBD5E1' : theme.textTertiary || '#888' },
                      ]}
                    >
                      {o.created_at ? new Date(o.created_at).toLocaleString() : ''}
                    </Text>
                  </View>

                  <View style={styles.cardRightColumn}>
                    <Text
                      style={[
                        styles.cardPrice,
                        { color: isSelected ? '#FFFFFF' : theme.primary },
                      ]}
                    >
                      {formatCurrency(o.total)}
                    </Text>
                    <ChevronRight
                      size={18}
                      color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // --- RIGHT PANEL (Order Details Receipt) ---
  const rightPanel = selectedOrder ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Receipt size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              Order #{selectedOrder.order_number || selectedOrder.id}
            </Text>
            <Text style={[styles.detailsPrice, { color: theme.primary }]}>
              {formatCurrency(selectedOrder.total)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        {/* Customer Info Card (CRM) */}
        {selectedOrder.customer_name ? (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.primary + '10',
                borderColor: theme.primary + '30',
                marginBottom: 12,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <User size={18} color={theme.primary} />
              <Text style={[styles.infoCardTitle, { color: theme.primary, marginBottom: 0 }]}>
                Customer Information
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Customer Name:</Text>
              <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
                {selectedOrder.customer_name}
              </Text>
            </View>
            {/* {selectedOrder.customer_id && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Customer ID:</Text>
                <Text style={[styles.infoValue, { color: theme.textSecondary }]}>
                  #{selectedOrder.customer_id}
                </Text>
              </View>
            )} */}
          </View>
        ) : null}

        {/* Receipt Header Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Transaction Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Order Number:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              #{selectedOrder.order_number || selectedOrder.id}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Payment Method:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {selectedOrder.payment_method?.toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Date & Time:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'Recent'}
            </Text>
          </View>
        </View>

        {/* Split Payments Breakdown if Split */}
        {!!selectedOrder.is_split && (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Users size={16} color={theme.primary} />
              <Text style={[styles.infoCardTitle, { color: theme.text, marginBottom: 0 }]}>
                Split Payments Breakdown
              </Text>
            </View>

            {loadingSplits ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : selectedOrderSplits.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Split payment details recorded for this order.
              </Text>
            ) : (
              selectedOrderSplits.map((sp, sIdx) => (
                <View
                  key={sIdx}
                  style={[
                    styles.infoRow,
                    {
                      paddingVertical: 6,
                      borderBottomWidth: sIdx < selectedOrderSplits.length - 1 ? 1 : 0,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                      Person {sp.split_index + 1} of {sp.total_splits}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                      {sp.payment_method?.toUpperCase()}
                      {sp.payment_provider ? ` (${sp.payment_provider})` : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>
                    {formatCurrency(sp.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Ordered Items List */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>
            Ordered Items ({selectedOrder.items?.length || 0})
          </Text>

          {(selectedOrder.items || []).map((item, idx) => (
            <View key={idx} style={[styles.orderItemRow, { borderBottomColor: theme.border }]}>
              <View style={styles.orderItemLeft}>
                <Text style={[styles.orderItemName, { color: theme.text }]}>{item.product_name}</Text>
                <Text style={[styles.orderItemSub, { color: theme.textSecondary }]}>
                  {item.quantity}x {formatCurrency(item.price)}
                </Text>
                {item.note && (
                  <Text style={[styles.orderItemNote, { color: theme.primary }]}>
                    Note: {item.note}
                  </Text>
                )}
              </View>
              <Text style={[styles.orderItemTotal, { color: theme.text }]}>
                {formatCurrency(item.subtotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Financial Breakdown */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 20 }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Payment & Tax Summary</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Subtotal:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {formatCurrency(selectedOrder.subtotal)}
            </Text>
          </View>

          {selectedOrder.discount_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.error }]}>
                Discount ({selectedOrder.discount_name || 'Promo'}):
              </Text>
              <Text style={[styles.infoValue, { color: theme.error, fontWeight: '700' }]}>
                -{formatCurrency(selectedOrder.discount_amount)}
              </Text>
            </View>
          )}

          {selectedOrder.tax_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tax (PPN / PB1):</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                +{formatCurrency(selectedOrder.tax_amount)}
              </Text>
            </View>
          )}

          {selectedOrder.service_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Service Charge:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                +{formatCurrency(selectedOrder.service_amount)}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.totalLabelText, { color: theme.text }]}>Total Paid:</Text>
            <Text style={[styles.totalValText, { color: theme.primary }]}>
              {formatCurrency(selectedOrder.total)}
            </Text>
          </View>

          {selectedOrder.payment_type === 'cash' && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Cash Received:</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {formatCurrency(selectedOrder.amount_paid)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.success || '#16A34A' }]}>Change Given:</Text>
                <Text style={[styles.infoValue, { color: theme.success || '#16A34A', fontWeight: '800' }]}>
                  {formatCurrency(selectedOrder.change_amount)}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <ClipboardList size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Order Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select an order from the list to view its complete receipt, customer details, and split breakdown.
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Header title="Orders & Receipts" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedOrder}
        onBack={() => setSelectedOrder(null)}
        backButtonTitle="Back to Orders"
        childrenPadding={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
  },
  searchBar: {
    marginBottom: 12,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubText: {
    fontSize: 13,
  },
  cardDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardRightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
  },

  // Details
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalValText: {
    fontSize: 18,
    fontWeight: '800',
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  orderItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  orderItemNote: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: '700',
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