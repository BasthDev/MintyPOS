import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { TaxFormData, TaxFormSheet } from '@/components/forms/TaxFormSheet';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase, TaxConfigItem } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { TaxProcess } from '@/processes/taxProcess';
import { useStore } from '@/store/useStore';
import {
  ChevronRight,
  Edit,
  Percent,
  Plus,
  Receipt,
  Trash2,
  Users,
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

export default function TaxServiceScreen() {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);

  const [taxes, setTaxes] = useState<TaxConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTax, setSelectedTax] = useState<TaxConfigItem | null>(null);
  const [search, setSearch] = useState('');

  // Form sheet state
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const res = await TaxProcess.getAll(db);
      if (res.success && res.data) {
        setTaxes(res.data);
        if (selectedTax) {
          const updated = res.data.find((t) => t.id === selectedTax.id);
          setSelectedTax(updated || null);
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to load tax configs');
      }
    } catch (error: any) {
      console.error('Failed to load tax configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setFormSheetVisible(true);
  };

  const handleStartEdit = (item: TaxConfigItem) => {
    setSelectedTax(item);
    setFormMode('edit');
    setFormSheetVisible(true);
  };

  const handleToggle = async (item: TaxConfigItem, nextActive: boolean) => {
    try {
      const db = await getDatabase();
      const res = await TaxProcess.toggleActive(db, item.id, nextActive);
      if (!res.success) {
        Alert.alert('Error', res.error || (res.errors && res.errors[0]) || 'Failed to toggle tax status');
        return;
      }
      await loadTaxes();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update tax status');
    }
  };

  const handleFormSubmit = async (formData: TaxFormData) => {
    setSaving(true);
    try {
      const db = await getDatabase();
      if (formMode === 'create') {
        const res = await TaxProcess.create(db, {
          name: formData.name,
          rate: formData.rate,
          type: formData.type,
        });
        if (!res.success) {
          Alert.alert('Validation Error', res.error || (res.errors && res.errors.join('\n')) || 'Failed to create tax config');
          return;
        }
      } else if (selectedTax) {
        const res = await TaxProcess.update(db, selectedTax.id, {
          name: formData.name,
          rate: formData.rate,
          type: formData.type,
        });
        if (!res.success) {
          Alert.alert('Validation Error', res.error || (res.errors && res.errors.join('\n')) || 'Failed to update tax config');
          return;
        }
      }

      setFormSheetVisible(false);
      await loadTaxes();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save tax configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Tax / Charge', 'Are you sure you want to delete this tax configuration?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = await getDatabase();
            const res = await TaxProcess.delete(db, id);
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to delete tax');
              return;
            }
            setSelectedTax(null);
            await loadTaxes();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete tax');
          }
        },
      },
    ]);
  };

  const filteredTaxes = taxes.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeTaxesCount = taxes.filter((t) => t.is_active === 1).length;

  // --- LEFT PANEL (List + Search + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search taxes (PB1, PPN, Service)..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {/* Summary Info Header */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Active Taxes & Fees:</Text>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {activeTaxesCount} of {taxes.length} Enabled
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredTaxes.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Receipt size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.text }]}>No taxes or charges configured</Text>
          <Text style={[styles.emptyListSubtext, { color: theme.textSecondary }]}>
            Tap + to add PB1, VAT, or service charge rules
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {filteredTaxes.map((item) => {
            const isSelected = selectedTax?.id === item.id;
            const isActive = item.is_active === 1;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                style={[
                  styles.taxCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedTax(item)}
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
                    {item.name.toLowerCase().includes('service') ? (
                      <Users size={20} color={isSelected ? '#FFFFFF' : '#0284C7'} />
                    ) : (
                      <Percent size={20} color={isSelected ? '#FFFFFF' : theme.primary} />
                    )}
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
                        styles.cardRate,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                    >
                      Rate: {item.type === 'percentage' ? `${item.rate}%` : formatCurrency(item.rate)} •{' '}
                      {isActive ? 'Active' : 'Disabled'}
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
        <Text style={styles.fabText}>New Tax / Fee</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Details view with Edit button triggering FormSheet) ---
  const rightPanel = selectedTax ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Percent size={26} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              {selectedTax.name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              Rate: {selectedTax.type === 'percentage' ? `${selectedTax.rate}%` : formatCurrency(selectedTax.rate)}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            onPress={() => handleStartEdit(selectedTax)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
            onPress={() => handleDelete(selectedTax.id)}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Tax Rule Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {selectedTax.name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Type:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedTax.type === 'percentage' ? 'Percentage (%)' : `Flat Amount (${currency?.symbol || '$'})`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Rate / Value:</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              {selectedTax.type === 'percentage' ? `${selectedTax.rate}%` : formatCurrency(selectedTax.rate)}
            </Text>
          </View>

          <View style={styles.statusToggleRow}>
            <View>
              <Text style={[styles.statusToggleLabel, { color: theme.text }]}>Active Status</Text>
              <Text style={[styles.statusToggleSub, { color: theme.textSecondary }]}>
                Applied automatically to orders during checkout
              </Text>
            </View>
            <Switch
              value={selectedTax.is_active === 1}
              onValueChange={(val) => handleToggle(selectedTax, val)}
              trackColor={{ false: '#D1D5DB', true: theme.primary }}
              thumbColor={selectedTax.is_active === 1 ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Receipt size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Tax Rule Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a tax item to view details or tap New Tax / Fee to configure a rule.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Tax & Service" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={selectedTax !== null}
        onBack={() => setSelectedTax(null)}
        backButtonTitle="Back to Taxes"
        childrenPadding={16}
      />

      {/* DripSheet Form Sheet */}
      <TaxFormSheet
        visible={formSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={
          selectedTax && formMode === 'edit'
            ? {
                name: selectedTax.name,
                rate: selectedTax.rate,
                type: selectedTax.type || 'percentage',
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
  taxCard: {
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
  cardRate: {
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
