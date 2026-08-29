import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { PaymentMethodFormData, PaymentMethodFormSheet } from '@/components/forms/PaymentMethodFormSheet';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase, PaymentMethodItem } from '@/lib/database';
import { PaymentMethodProcess } from '@/processes/paymentMethodProcess';
import {
  Banknote,
  ChevronRight,
  CreditCard,
  Edit,
  Plus,
  QrCode,
  Sliders,
  Smartphone,
  Trash2,
  Wallet
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PaymentMethodsScreen() {
  const { theme } = useTheme();

  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodItem | null>(null);
  const [search, setSearch] = useState('');

  // Form sheet state
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const res = await PaymentMethodProcess.getAll(db);
      if (res.success && res.data) {
        setMethods(res.data);
        if (selectedMethod) {
          const updated = res.data.find((m) => m.id === selectedMethod.id);
          setSelectedMethod(updated || null);
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to load payment methods');
      }
    } catch (error: any) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setFormSheetVisible(true);
  };

  const handleStartEdit = (item: PaymentMethodItem) => {
    setSelectedMethod(item);
    setFormMode('edit');
    setFormSheetVisible(true);
  };

  const handleToggle = async (item: PaymentMethodItem, nextActive: boolean) => {
    try {
      const db = await getDatabase();
      const res = await PaymentMethodProcess.toggleActive(db, item.id, nextActive);
      if (!res.success) {
        Alert.alert('Error', res.error || (res.errors && res.errors[0]) || 'Failed to toggle status');
        return;
      }
      await loadPaymentMethods();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update payment method');
    }
  };

  const handleFormSubmit = async (formData: PaymentMethodFormData) => {
    setSaving(true);
    try {
      const db = await getDatabase();
      if (formMode === 'create') {
        const res = await PaymentMethodProcess.create(db, {
          typeKey: formData.typeKey,
          typeLabel: formData.typeLabel,
          methodName: formData.methodName,
        });
        if (!res.success) {
          Alert.alert('Validation Error', res.error || (res.errors && res.errors.join('\n')) || 'Failed to create payment method');
          return;
        }
      } else if (selectedMethod) {
        const res = await PaymentMethodProcess.update(db, selectedMethod.id, {
          methodName: formData.methodName,
        });
        if (!res.success) {
          Alert.alert('Validation Error', res.error || (res.errors && res.errors.join('\n')) || 'Failed to update payment method');
          return;
        }
      }

      setFormSheetVisible(false);
      await loadPaymentMethods();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Payment Method', 'Are you sure you want to delete this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDatabase();
            const res = await PaymentMethodProcess.delete(db, id);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete payment method');
              return;
            }
            setSelectedMethod(null);
            await loadPaymentMethods();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete payment method');
          }
        },
      },
    ]);
  };

  const getMethodIcon = (typeKey: string) => {
    // Handle various possible type_key variations for bank transfer
    if (typeKey?.includes('bank') || typeKey?.includes('transfer')) {
      return <Smartphone size={20} color={theme.primary} />;
    }
    
    switch (typeKey) {
      case 'cash':
        return <Banknote size={20} color={theme.primary} />;
      case 'qris':
        return <QrCode size={20} color={theme.primary} />;
      case 'ewallet':
        return <Wallet size={20} color={theme.primary} />;
      case 'card':
        return <CreditCard size={20} color={theme.primary} />;
      default:
        return <Sliders size={20} color={theme.textSecondary} />;
    }
  };

  const filteredMethods = methods.filter(
    (m) =>
      m.method_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.type_label?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedMethods: Record<string, PaymentMethodItem[]> = {};
  filteredMethods.forEach((m) => {
    if (!groupedMethods[m.type_label]) {
      groupedMethods[m.type_label] = [];
    }
    groupedMethods[m.type_label].push(m);
  });

  // --- LEFT PANEL (Main List + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search payment methods (DANA, BCA, QRIS)..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredMethods.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <CreditCard size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No payment methods found</Text>
          <Text style={[styles.emptyListSubtext, { color: theme.textSecondary }]}>
            Tap + to add a new payment method
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedMethods).map(([typeLabel, items]) => (
            <View key={typeLabel} style={styles.typeGroup}>
              <View style={styles.typeGroupHeader}>
                <Text style={[styles.typeGroupTitle, { color: theme.textSecondary }]}>
                  {typeLabel.toUpperCase()}
                </Text>
                <Text style={[styles.typeGroupCount, { color: theme.textTertiary }]}>
                  {items.filter((i) => i.is_active === 1).length}/{items.length} Active
                </Text>
              </View>

              {items.map((item) => {
                const isSelected = selectedMethod?.id === item.id;
                const isActive = item.is_active === 1;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    style={[
                      styles.methodCard,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedMethod(item)}
                  >
                    <View style={styles.cardMain}>
                      <View
                        style={[
                          styles.iconBadge,
                          {
                            backgroundColor: isSelected
                              ? 'rgba(255,255,255,0.2)'
                              : theme.input,
                          },
                        ]}
                      >
                        {getMethodIcon(item.type_key)}
                      </View>

                      <View style={styles.cardInfo}>
                        <View style={styles.cardNameRow}>
                          <Text
                            style={[
                              styles.cardName,
                              { color: isSelected ? '#FFFFFF' : theme.text },
                            ]}
                          >
                            {item.method_name}
                          </Text>
                          {item.is_system === 1 && (
                            <View style={styles.systemBadge}>
                              <Text style={styles.systemBadgeText}>DEFAULT</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.cardType,
                            { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                          ]}
                        >
                          {item.type_label} • {isActive ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>

                      <View style={styles.cardRightCol} onStartShouldSetResponder={() => true}>
                        <Switch
                          value={isActive}
                          onValueChange={(val) => handleToggle(item, val)}
                          disabled={item.is_system === 1}
                          trackColor={{ false: '#D1D5DB', true: theme.primary }}
                          thumbColor={isActive ? '#FFFFFF' : '#9CA3AF'}
                        />
                        <ChevronRight
                          size={18}
                          color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={handleStartCreate}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Method</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Details view with Edit button that triggers FormSheet) ---
  const rightPanel = selectedMethod ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            {getMethodIcon(selectedMethod.type_key)}
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              {selectedMethod.method_name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              Type: {selectedMethod.type_label}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            onPress={() => handleStartEdit(selectedMethod)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>

          {selectedMethod.is_system !== 1 && (
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
              onPress={() => handleDelete(selectedMethod.id)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Provider Information</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Method Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {selectedMethod.method_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category Type:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedMethod.type_label} ({selectedMethod.type_key})
            </Text>
          </View>

          <View style={styles.statusToggleRow}>
            <View>
              <Text style={[styles.statusToggleLabel, { color: theme.text }]}>Active Status</Text>
              <Text style={[styles.statusToggleSub, { color: theme.textSecondary }]}>
                {selectedMethod.is_system === 1
                  ? 'Default cash payment is permanently active'
                  : 'Available during POS checkout'}
              </Text>
            </View>
            <Switch
              value={selectedMethod.is_active === 1}
              onValueChange={(val) => handleToggle(selectedMethod, val)}
              disabled={selectedMethod.is_system === 1}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor={selectedMethod.is_active === 1 ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <CreditCard size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Payment Method Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a method to view details or tap New Method to add a new provider/bank.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Payment Methods" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={selectedMethod !== null}
        onBack={() => setSelectedMethod(null)}
        backButtonTitle="Back to Payment Methods"
        childrenPadding={16}
      />

      {/* DripSheet Form Sheet */}
      <PaymentMethodFormSheet
        visible={formSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={
          selectedMethod && formMode === 'edit'
            ? {
                typeKey: selectedMethod.type_key,
                typeLabel: selectedMethod.type_label,
                methodName: selectedMethod.method_name,
              }
            : undefined
        }
        mode={formMode}
        loading={saving}
      />
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
  typeGroup: {
    marginBottom: 16,
  },
  typeGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  typeGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  typeGroupCount: {
    fontSize: 12,
  },
  methodCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  systemBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  cardType: {
    fontSize: 12,
    marginTop: 2,
  },
  cardRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // FAB
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
  detailsHeaderMeta: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteBtn: {
    padding: 10,
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
  infoCardTitle: {
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
  infoValue: {
    fontSize: 13,
  },
  statusToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statusToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusToggleSub: {
    fontSize: 12,
    marginTop: 2,
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
