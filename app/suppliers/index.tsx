import { SupplierFormSheet } from '@/components/forms/SupplierFormSheet';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { SupplierProcess } from '@/processes/supplierProcess';
import { ChevronRight, Edit, Plus, Trash2, Truck } from 'lucide-react-native';
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

export default function SuppliersScreen() {
  const { theme } = useTheme();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await SupplierProcess.getAll(db);
      if (result.success && result.data) {
        const suppliersWithStats = await Promise.all(
          result.data.map(async (supplier: any) => {
            const statsResult = await SupplierProcess.getStats(db, supplier.id);
            return {
              ...supplier,
              stats: statsResult.success ? statsResult.data : null,
            };
          })
        );
        setSuppliers(suppliersWithStats);
        if (selectedSupplier) {
          const updated = suppliersWithStats.find((s: any) => s.id === selectedSupplier.id);
          setSelectedSupplier(updated || null);
        }
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormMode('edit');
    setFormVisible(true);
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    Alert.alert(
      'Delete Supplier',
      'Are you sure you want to delete this supplier? This will affect inventory records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await SupplierProcess.delete(db, supplierId);
              if (result.success) {
                if (selectedSupplier?.id === supplierId) {
                  setSelectedSupplier(null);
                }
                loadSuppliers();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete supplier');
              }
            } catch (error) {
              console.error('Failed to delete supplier:', error);
              Alert.alert('Error', 'Failed to delete supplier');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: { name: string; contact: string }) => {
    try {
      const db = await getDatabase();
      let result;

      if (formMode === 'create') {
        result = await SupplierProcess.create(db, data);
      } else {
        result = await SupplierProcess.update(db, editingSupplier.id, data);
      }

      if (result.success) {
        setFormVisible(false);
        loadSuppliers();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save supplier:', error);
      Alert.alert('Error', 'Failed to save supplier');
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const query = search.toLowerCase();
    return s.name?.toLowerCase().includes(query) || s.contact?.toLowerCase().includes(query);
  });

  // --- LEFT PANEL (Main Screen: Search + Supplier List + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search suppliers..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredSuppliers.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Truck size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
            {search ? 'No suppliers match search' : 'No suppliers found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredSuppliers.map((s) => {
            const isSelected = selectedSupplier?.id === s.id;

            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.7}
                style={[
                  styles.supplierCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedSupplier(s)}
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
                      {s.name}
                    </Text>
                    {s.contact && (
                      <Text
                        style={[
                          styles.cardSubText,
                          { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        Contact: {s.contact}
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
        onPress={handleAddSupplier}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Supplier</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Supplier Details View) ---
  const rightPanel = selectedSupplier ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Truck size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedSupplier.name}
            </Text>
            {selectedSupplier.contact && (
              <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
                {selectedSupplier.contact}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.detailsHeaderActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleEditSupplier(selectedSupplier)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDeleteSupplier(selectedSupplier.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Supplier Information</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedSupplier.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Contact / Phone:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedSupplier.contact || 'N/A'}</Text>
          </View>

          {selectedSupplier.stats && (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Restock Orders:</Text>
                <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
                  {selectedSupplier.stats.totalBatches} orders
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Ingredients Supplied:</Text>
                <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
                  {selectedSupplier.stats.ingredientCount} items
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Total Order Value:</Text>
                <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
                  {formatCurrency(selectedSupplier.stats.totalValue)}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Truck size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Supplier Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a supplier from the list to view its stats and order details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Suppliers" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedSupplier}
        onBack={() => setSelectedSupplier(null)}
        backButtonTitle="Back to Suppliers"
        childrenPadding={16}
      />
      <SupplierFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingSupplier}
        mode={formMode}
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
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  supplierCard: {
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
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 6,
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
  detailsHeaderMeta: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsSubtitle: {
    fontSize: 14,
    marginTop: 2,
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