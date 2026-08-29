import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { DiscountFormData, DiscountFormSheet } from '@/components/forms/DiscountFormSheet';
import { useTheme } from '@/constants/colorTheme';
import { DiscountItem, getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { DiscountProcess } from '@/processes/discountProcess';
import { useStore } from '@/store/useStore';
import {
  BadgePercent,
  ChevronRight,
  Edit,
  Plus,
  Tag,
  Trash2,
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

export default function DiscountsScreen() {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);

  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountItem | null>(null);
  const [search, setSearch] = useState('');

  // Form sheet state
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const res = await DiscountProcess.getAll(db);
      if (res.success && res.data) {
        setDiscounts(res.data);
        if (selectedDiscount) {
          const updated = res.data.find((d) => d.id === selectedDiscount.id);
          setSelectedDiscount(updated || null);
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to load discounts');
      }
    } catch (error: any) {
      console.error('Failed to load discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setFormSheetVisible(true);
  };

  const handleStartEdit = (item: DiscountItem) => {
    setSelectedDiscount(item);
    setFormMode('edit');
    setFormSheetVisible(true);
  };

  const handleToggle = async (item: DiscountItem, nextActive: boolean) => {
    try {
      const db = await getDatabase();
      const res = await DiscountProcess.toggleActive(db, item.id, nextActive);
      if (!res.success) {
        Alert.alert('Error', res.error || (res.errors && res.errors[0]) || 'Failed to toggle discount status');
        return;
      }
      await loadDiscounts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update discount status');
    }
  };

  const handleFormSubmit = async (formData: DiscountFormData) => {
    setSaving(true);
    try {
      const db = await getDatabase();
      if (formMode === 'create') {
        const res = await DiscountProcess.create(db, {
          name: formData.name,
          type: formData.type,
          value: formData.value,
          minOrderAmount: formData.minOrderAmount,
          maxDiscountAmount: formData.maxDiscountAmount,
        });
        if (!res.success) {
          Alert.alert('Validation Error', res.error || (res.errors && res.errors.join('\n')) || 'Failed to create discount preset');
          return;
        }
      } else if (selectedDiscount) {
        const res = await DiscountProcess.update(db, selectedDiscount.id, {
          name: formData.name,
          type: formData.type,
          value: formData.value,
          minOrderAmount: formData.minOrderAmount,
          maxDiscountAmount: formData.maxDiscountAmount,
        });
        if (!res.success) {
          Alert.alert('Validation Error', res.error || (res.errors && res.errors.join('\n')) || 'Failed to update discount preset');
          return;
        }
      }

      setFormSheetVisible(false);
      await loadDiscounts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save discount preset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Discount', 'Are you sure you want to delete this discount preset?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDatabase();
            const res = await DiscountProcess.delete(db, id);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete discount');
              return;
            }
            setSelectedDiscount(null);
            await loadDiscounts();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete discount');
          }
        },
      },
    ]);
  };

  const filteredDiscounts = discounts.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeDiscountsCount = discounts.filter((d) => d.is_active === 1).length;

  // --- LEFT PANEL (List + Search + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search discounts (Member, Promo)..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {/* Summary Info Header */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Active Discounts:</Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {activeDiscountsCount} of {discounts.length} Available
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredDiscounts.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Tag size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No discounts configured</Text>
          <Text style={[styles.emptyListSubtext, { color: theme.textSecondary }]}>
            Tap + to add percentage or flat discounts
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {filteredDiscounts.map((item) => {
            const isSelected = selectedDiscount?.id === item.id;
            const isActive = item.is_active === 1;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                style={[
                  styles.discountCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedDiscount(item)}
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
                    <BadgePercent
                      size={20}
                      color={isSelected ? '#FFFFFF' : theme.primary}
                    />
                  </View>

                  <View style={styles.cardInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.cardValue,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                    >
                      {item.type === 'percentage'
                        ? `${item.value}% OFF`
                        : `${formatCurrency(item.value)} OFF`}
                      {item.min_order_amount > 0 &&
                        ` • Min ${formatCurrency(item.min_order_amount)}`}
                    </Text>
                  </View>

                  <View style={styles.cardRightCol} onStartShouldSetResponder={() => true}>
                    <Switch
                      value={isActive}
                      onValueChange={(val) => handleToggle(item, val)}
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
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={handleStartCreate}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Discount</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Details view with Edit button triggering FormSheet) ---
  const rightPanel = selectedDiscount ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Tag size={26} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              {selectedDiscount.name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              {selectedDiscount.type === 'percentage'
                ? `${selectedDiscount.value}% OFF`
                : `${formatCurrency(selectedDiscount.value)} OFF`}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            onPress={() => handleStartEdit(selectedDiscount)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
            onPress={() => handleDelete(selectedDiscount.id)}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Discount Configuration</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {selectedDiscount.name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Type:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedDiscount.type === 'percentage' ? 'Percentage (%)' : `Flat Amount (${currency?.symbol || '$'})`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Discount Value:</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              {selectedDiscount.type === 'percentage'
                ? `${selectedDiscount.value}%`
                : formatCurrency(selectedDiscount.value)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Min. Order Spend:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedDiscount.min_order_amount > 0
                ? formatCurrency(selectedDiscount.min_order_amount)
                : 'No Minimum'}
            </Text>
          </View>

          {selectedDiscount.type === 'percentage' && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Max. Discount Cap:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {selectedDiscount.max_discount_amount
                  ? formatCurrency(selectedDiscount.max_discount_amount)
                  : 'No Limit'}
              </Text>
            </View>
          )}

          <View style={styles.statusToggleRow}>
            <View>
              <Text style={[styles.statusToggleLabel, { color: theme.text }]}>Active Status</Text>
              <Text style={[styles.statusToggleSub, { color: theme.textSecondary }]}>
                Selectable by cashiers at checkout
              </Text>
            </View>
            <Switch
              value={selectedDiscount.is_active === 1}
              onValueChange={(val) => handleToggle(selectedDiscount, val)}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor={selectedDiscount.is_active === 1 ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Tag size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Discount Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a discount preset to view details or tap New Discount to create a promotional rule.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Discounts" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={selectedDiscount !== null}
        onBack={() => setSelectedDiscount(null)}
        backButtonTitle="Back to Discounts"
        childrenPadding={16}
      />

      {/* DripSheet Form Sheet */}
      <DiscountFormSheet
        visible={formSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={
          selectedDiscount && formMode === 'edit'
            ? {
                name: selectedDiscount.name,
                type: selectedDiscount.type,
                value: selectedDiscount.value,
                minOrderAmount: selectedDiscount.min_order_amount,
                maxDiscountAmount: selectedDiscount.max_discount_amount,
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
    marginBottom: 8,
  },
  summaryCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
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
  discountCard: {
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
  cardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardValue: {
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
