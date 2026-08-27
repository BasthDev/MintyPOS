import { CustomerFormSheet } from '@/components/forms/CustomerFormSheet';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { CustomerItem, getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { CustomerProcess } from '@/processes/customerProcess';
import { useStore } from '@/store/useStore';
import {
  Award,
  ChevronRight,
  CreditCard,
  Edit,
  Plus,
  Trash2,
  User,
  Wallet
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const TIER_COLORS: Record<string, string> = {
  regular: '#6B7280',
  bronze: '#B45309',
  silver: '#475569',
  gold: '#D97706',
};

export default function CustomersScreen() {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [search, setSearch] = useState('');

  // Form sheet state
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);

  // Store Credit Deposit Modal state
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositing, setDepositing] = useState(false);

  // Logs state
  const [loyaltyLogs, setLoyaltyLogs] = useState<any[]>([]);
  const [balanceLogs, setBalanceLogs] = useState<any[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const res = await CustomerProcess.getAll(db);
      if (res.success && res.data) {
        setCustomers(res.data);
        if (selectedCustomer) {
          const updated = res.data.find((c) => c.id === selectedCustomer.id);
          if (updated) {
            setSelectedCustomer(updated);
            loadLogs(updated.id);
          } else {
            setSelectedCustomer(null);
          }
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to load customers');
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (customerId: number) => {
    try {
      const db = await getDatabase();
      const res = await CustomerProcess.getLogs(db, customerId);
      if (res.success) {
        setLoyaltyLogs(res.loyaltyLogs || []);
        setBalanceLogs(res.balanceLogs || []);
      }
    } catch (err) {
      console.error('Failed to load customer logs:', err);
    }
  };

  const handleSelectCustomer = (item: CustomerItem) => {
    setSelectedCustomer(item);
    loadLogs(item.id);
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setFormSheetVisible(true);
  };

  const handleStartEdit = (item: CustomerItem) => {
    setSelectedCustomer(item);
    setFormMode('edit');
    setFormSheetVisible(true);
  };

  const handleFormSubmit = async (formData: any) => {
    setSaving(true);
    try {
      const db = await getDatabase();
      if (formMode === 'create') {
        const res = await CustomerProcess.create(db, formData);
        if (!res.success) {
          Alert.alert('Validation Error', res.error || 'Failed to create customer');
          return;
        }
      } else if (selectedCustomer) {
        const res = await CustomerProcess.update(db, selectedCustomer.id, formData);
        if (!res.success) {
          Alert.alert('Validation Error', res.error || 'Failed to update customer');
          return;
        }
      }

      setFormSheetVisible(false);
      await loadCustomers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Customer', 'Are you sure you want to delete this customer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDatabase();
            const res = await CustomerProcess.delete(db, id);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete customer');
              return;
            }
            setSelectedCustomer(null);
            await loadCustomers();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete customer');
          }
        },
      },
    ]);
  };

  const handleDepositSubmit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount greater than 0');
      return;
    }
    if (!selectedCustomer) return;

    setDepositing(true);
    try {
      const db = await getDatabase();
      const res = await CustomerProcess.depositCredit(db, selectedCustomer.id, amt, depositNotes);
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to deposit store credit');
        return;
      }
      setDepositModalVisible(false);
      setDepositAmount('');
      setDepositNotes('');
      await loadCustomers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to deposit store credit');
    } finally {
      setDepositing(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  // --- LEFT PANEL (Main Customer List) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search customers..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredCustomers.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <User size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
            {search ? 'No customers match search' : 'No customers found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {filteredCustomers.map((c) => {
            const isSelected = selectedCustomer?.id === c.id;

            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.7}
                style={[
                  styles.customerCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleSelectCustomer(c)}
              >
                <View style={styles.cardMain}>
                  <View style={styles.cardHeaderInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    {c.phone && (
                      <Text
                        style={[
                          styles.cardMetaText,
                          { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                        ]}
                      >
                        {c.phone}
                      </Text>
                    )}
                  </View>

                  <ChevronRight
                    size={20}
                    color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={handleStartCreate}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Customer</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Customer Details View) ---
  const rightPanel = selectedCustomer ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <User size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedCustomer.name}
            </Text>
          </View>
        </View>

        <View style={styles.detailsHeaderActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleStartEdit(selectedCustomer)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDelete(selectedCustomer.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Award size={20} color={theme.primary} />
            <Text style={[styles.statBoxValue, { color: theme.primary }]}>
              {selectedCustomer.loyalty_points || 0}
            </Text>
            <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Loyalty Points</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Wallet size={20} color={theme.success} />
            <Text style={[styles.statBoxValue, { color: theme.success }]}>
              {formatCurrency(selectedCustomer.store_credit_balance || 0)}
            </Text>
            <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Store Credit</Text>
          </View>
        </View>

        {/* Deposit Credit Action Button */}
        <TouchableOpacity
          style={[styles.depositBtn, { backgroundColor: theme.primary }]}
          onPress={() => setDepositModalVisible(true)}
          activeOpacity={0.8}
        >
          <CreditCard size={18} color="#FFFFFF" />
          <Text style={styles.depositBtnText}>Deposit Store Credit</Text>
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Customer Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedCustomer.name}</Text>
          </View>

          {selectedCustomer.phone && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Phone:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{selectedCustomer.phone}</Text>
            </View>
          )}

          {selectedCustomer.email && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{selectedCustomer.email}</Text>
            </View>
          )}

          {selectedCustomer.notes && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Notes:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{selectedCustomer.notes}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tier:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedCustomer.tier ? selectedCustomer.tier.toUpperCase() : 'REGULAR'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Spent:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{formatCurrency(selectedCustomer.total_spent || 0)}</Text>
          </View>
        </View>

        {/* Recent Activity / Loyalty Logs */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Loyalty History</Text>
          {loyaltyLogs.length === 0 ? (
            <Text style={[styles.emptyLogText, { color: theme.textSecondary }]}>No loyalty points history yet.</Text>
          ) : (
            loyaltyLogs.map((log) => (
              <View key={log.id} style={[styles.logRow, { borderBottomColor: theme.divider }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.logType, { color: theme.text }]}>
                    {log.type === 'earn' ? 'Earned Points' : log.type === 'redeem' ? 'Redeemed Points' : 'Adjustment'}
                  </Text>
                  <Text style={[styles.logDate, { color: theme.textSecondary }]}>
                    {log.created_at}
                    {log.order_number && ` • ${log.order_number}`}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.logPoints,
                    { color: log.points >= 0 ? theme.success : theme.error },
                  ]}
                >
                  {log.points >= 0 ? `+${log.points}` : log.points} Pts
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <User size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Customer Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a customer from the list to view its details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Customers & CRM" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
        backButtonTitle="Back to Customers"
        childrenPadding={16}
      />

      {/* Form Sheet for Create / Edit */}
      <CustomerFormSheet
        visible={formSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={
          selectedCustomer
            ? {
                name: selectedCustomer.name,
                phone: selectedCustomer.phone,
                email: selectedCustomer.email,
                notes: selectedCustomer.notes,
              }
            : undefined
        }
        mode={formMode}
        loading={saving}
      />

      {/* Deposit Credit Modal */}
      <Modal
        visible={depositModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Deposit Store Credit
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Customer: {selectedCustomer?.name}
            </Text>

            <View style={{ gap: 12, marginVertical: 16 }}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Deposit Amount ({currency?.symbol || '$'})
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.input, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Notes (Optional)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: theme.input, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="e.g. Top up via cash"
                placeholderTextColor={theme.textTertiary}
                value={depositNotes}
                onChangeText={setDepositNotes}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setDepositModalVisible(false)}
                disabled={depositing}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleDepositSubmit}
                disabled={depositing}
              >
                {depositing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Confirm Deposit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    marginBottom: 12,
  },
  loadingContainer: {
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
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  customerCard: {
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
  },
  cardMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  fabButton: {
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
  detailsHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailsScroll: {
    flex: 1,
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    marginTop: 2,
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
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  depositBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyLogText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  logType: {
    fontSize: 13,
    fontWeight: '600',
  },
  logDate: {
    fontSize: 11,
    marginTop: 2,
  },
  logPoints: {
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
