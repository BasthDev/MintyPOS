import { Header } from '@/components/Header';
import { DripChip } from '@/components/Chip';
import { PurchaseOrderFormSheet } from '@/components/forms/PurchaseOrderFormSheet';
import { ReceiveGoodsFormSheet } from '@/components/forms/ReceiveGoodsFormSheet';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase, PurchaseOrder } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { PurchaseOrderProcess } from '@/processes/purchaseOrderProcess';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  PackageCheck,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PurchaseOrdersScreen() {
  const { theme } = useTheme();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ordered' | 'received' | 'draft' | 'cancelled'>('all');

  const [formVisible, setFormVisible] = useState(false);
  const [receiveVisible, setReceiveVisible] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await PurchaseOrderProcess.getAll(db);
      if (result.success && result.data) {
        setOrders(result.data);
        if (selectedOrder) {
          const updated = result.data.find((o) => o.id === selectedOrder.id);
          setSelectedOrder(updated || null);
        }
      }
    } catch (e) {
      console.error('Failed to load purchase orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormVisible(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const db = await getDatabase();
      const result = await PurchaseOrderProcess.create(db, data);
      if (result.success) {
        setFormVisible(false);
        await loadOrders();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Failed to create PO');
      }
    } catch (e) {
      console.error('Failed to submit PO:', e);
      Alert.alert('Error', 'Failed to create purchase order');
    }
  };

  const handleReceiveGoods = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setReceiveVisible(true);
  };

  const handleReceiveSubmit = async (data: { poId: number; items: any[] }) => {
    setReceiveLoading(true);
    try {
      const db = await getDatabase();
      const result = await PurchaseOrderProcess.receive(db, data.poId, data.items);
      if (result.success) {
        setReceiveVisible(false);
        Alert.alert('Stock Received', 'Inventory batches have been successfully added to warehouse stock!');
        await loadOrders();
      } else {
        Alert.alert('Error', result.error || 'Failed to receive goods');
      }
    } catch (e) {
      console.error('Failed to receive goods:', e);
      Alert.alert('Error', 'Failed to receive goods');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleDelete = (orderId: number) => {
    Alert.alert(
      'Delete Purchase Order',
      'Are you sure you want to delete this purchase order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await PurchaseOrderProcess.delete(db, orderId);
              if (result.success) {
                if (selectedOrder?.id === orderId) setSelectedOrder(null);
                loadOrders();
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete purchase order');
            }
          },
        },
      ]
    );
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.po_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.supplier_name && o.supplier_name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return {
          label: 'Received',
          bg: '#DCFCE7',
          color: '#16A34A',
          icon: <CheckCircle2 size={12} color="#16A34A" />,
        };
      case 'ordered':
        return {
          label: 'Ordered',
          bg: '#FEF3C7',
          color: '#D97706',
          icon: <Clock size={12} color="#D97706" />,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          bg: '#FEE2E2',
          color: '#DC2626',
          icon: <XCircle size={12} color="#DC2626" />,
        };
      default:
        return {
          label: 'Draft',
          bg: '#F1F5F9',
          color: '#64748B',
          icon: <Clock size={12} color="#64748B" />,
        };
    }
  };

  // --- LEFT PANEL ---
  const leftPanel = (
    <View style={styles.leftContainer}>
      <DripSearchBar
        placeholder="Search PO number or supplier..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {(['all', 'ordered', 'received', 'draft', 'cancelled'] as const).map((st) => (
          <DripChip
            key={st}
            label={st.toUpperCase()}
            selected={statusFilter === st}
            onPress={() => setStatusFilter(st)}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centerContainer}>
          <ShoppingCart size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {search ? 'No purchase orders match your search' : 'No purchase orders found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {filteredOrders.map((o) => {
            const isSelected = selectedOrder?.id === o.id;
            const badge = getStatusBadge(o.status);

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
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardPoNumber, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                      {o.po_number}
                    </Text>
                    <Text style={[styles.cardSupplier, { color: isSelected ? '#E0F2FE' : theme.textSecondary }]}>
                      {o.supplier_name || 'No Supplier'}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    {badge.icon}
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={[styles.cardMeta, { color: isSelected ? '#CBD5E1' : theme.textTertiary }]}>
                    {o.items?.length || 0} items • {o.order_date}
                  </Text>
                  <Text style={[styles.cardAmount, { color: isSelected ? '#FFFFFF' : theme.primary }]}>
                    {formatCurrency(o.total_amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleCreate}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New PO</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Details) ---
  const rightPanel = selectedOrder ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Truck size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailsPoNumber, { color: theme.text }]}>{selectedOrder.po_number}</Text>
            <Text style={[styles.detailsSupplier, { color: theme.primary }]}>
              {selectedOrder.supplier_name || 'Supplier'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {selectedOrder.status !== 'received' && (
            <TouchableOpacity
              style={[styles.receiveBtn, { backgroundColor: theme.primary }]}
              onPress={() => handleReceiveGoods(selectedOrder)}
            >
              <PackageCheck size={16} color="#FFFFFF" />
              <Text style={styles.receiveBtnText}>Receive Goods</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDelete(selectedOrder.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>Order Details</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(selectedOrder.status).bg }]}>
              {getStatusBadge(selectedOrder.status).icon}
              <Text style={[styles.statusBadgeText, { color: getStatusBadge(selectedOrder.status).color }]}>
                {getStatusBadge(selectedOrder.status).label}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Order Date:</Text>
            <Text style={[styles.infoVal, { color: theme.text }]}>{selectedOrder.order_date}</Text>
          </View>
          {selectedOrder.expected_date && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Expected Delivery:</Text>
              <Text style={[styles.infoVal, { color: theme.text }]}>{selectedOrder.expected_date}</Text>
            </View>
          )}
          {selectedOrder.received_date && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Received Date:</Text>
              <Text style={[styles.infoVal, { color: theme.text }]}>
                {new Date(selectedOrder.received_date).toLocaleDateString()}
              </Text>
            </View>
          )}
          {selectedOrder.notes && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Notes:</Text>
              <Text style={[styles.notesText, { color: theme.text }]}>{selectedOrder.notes}</Text>
            </View>
          )}
        </View>

        {/* Items Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            Ordered Items ({selectedOrder.items?.length || 0})
          </Text>

          {selectedOrder.items?.map((it, idx) => (
            <View key={idx} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.text }]}>{it.ingredient_name}</Text>
                <Text style={[styles.itemQty, { color: theme.textSecondary }]}>
                  {it.quantity_ordered} {it.unit_name} (×{it.multiplier_to_base} {it.base_unit_symbol || 'base'}) @ Rp {it.unit_price.toLocaleString()}/{it.unit_name}
                </Text>
                {it.quantity_received > 0 && (
                  <Text style={[styles.itemReceivedMeta, { color: '#16A34A' }]}>
                    Received: {it.quantity_received} {it.unit_name}
                  </Text>
                )}
              </View>
              <Text style={[styles.itemTotal, { color: theme.primary }]}>
                {formatCurrency(it.total_price)}
              </Text>
            </View>
          ))}

          <View style={styles.grandTotalRow}>
            <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Total PO Amount:</Text>
            <Text style={[styles.grandTotalVal, { color: theme.primary }]}>
              {formatCurrency(selectedOrder.total_amount)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetails}>
      <ShoppingCart size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Purchase Order Selected</Text>
      <Text style={[styles.emptyDetailsSub, { color: theme.textSecondary }]}>
        Select an order from the list to view items, receiving verification, and supplier details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Purchase Orders" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedOrder}
        onBack={() => setSelectedOrder(null)}
        backButtonTitle="Back to PO List"
        childrenPadding={16}
      />
      <PurchaseOrderFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        mode="create"
      />
      <ReceiveGoodsFormSheet
        visible={receiveVisible}
        onClose={() => setReceiveVisible(false)}
        purchaseOrder={selectedOrder}
        onSubmit={handleReceiveSubmit}
        loading={receiveLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    marginBottom: 8,
  },
  filterScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardPoNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSupplier: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
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
  detailsPoNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailsSupplier: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  receiveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
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
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemQty: {
    fontSize: 12,
    marginTop: 2,
  },
  itemReceivedMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyDetails: {
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
  emptyDetailsSub: {
    fontSize: 14,
    textAlign: 'center',
  },
});
