import { InventoryFormSheet } from '@/components/forms/InventoryFormSheet';
import { ProductRestockFormSheet } from '@/components/forms/ProductRestockFormSheet';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { InventoryProcess } from '@/processes/inventoryProcess';
import { Layers, Package, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function InventoryScreen() {
  const { theme } = useTheme();

  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0 });

  const [formVisible, setFormVisible] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const [batchesResult, valueResult] = await Promise.all([
        InventoryProcess.getAllBatches(db),
        InventoryProcess.getTotalInventoryValue(db),
      ]);

      if (batchesResult.success && batchesResult.data) {
        setBatches(batchesResult.data);
        setStats({
          totalItems: batchesResult.data.length,
          totalValue: valueResult.success ? valueResult.data || 0 : 0,
        });
        if (selectedBatch) {
          const updated = batchesResult.data.find((b: any) => b.id === selectedBatch.id);
          setSelectedBatch(updated || null);
        }
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = () => {
    setFormVisible(true);
  };

  const handleProductRestock = () => {
    setProductFormVisible(true);
  };

  const handleFormSubmit = async (data: {
    items: Array<{
      ingredientId: number;
      supplierId: number;
      quantityBought: number;
      boughtUnit: string;
      unitMultiplier: number;
      totalCostPaid: number;
      expirationDate?: string;
    }>;
  }) => {
    try {
      const db = await getDatabase();
      for (const item of data.items) {
        const result = await InventoryProcess.createBatch(db, item);
        if (!result.success) {
          alert(result.errors?.join(', ') || result.error || 'Failed to restock item');
          return;
        }
      }
      setFormVisible(false);
      loadInventory();
    } catch (error) {
      console.error('Failed to restock:', error);
      alert('Failed to restock');
    }
  };

  const handleProductFormSubmit = async (data: {
    productId: number;
    quantityToAdd: number;
  }) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
        [data.quantityToAdd, data.productId]
      );
      setProductFormVisible(false);
      loadInventory();
    } catch (error) {
      console.error('Failed to restock product:', error);
      alert('Failed to restock product');
    }
  };

  const filteredBatches = batches.filter((b) => {
    const query = search.toLowerCase();
    return b.ingredient_name?.toLowerCase().includes(query) || b.supplier_name?.toLowerCase().includes(query);
  });

  // --- LEFT PANEL (Main Screen: List + Search + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search inventory batches..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredBatches.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Layers size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
            {search ? 'No batches match search' : 'No inventory records found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredBatches.map((b) => {
            const isSelected = selectedBatch?.id === b.id;

            return (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.7}
                style={[
                  styles.batchCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedBatch(b)}
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
                      {b.ingredient_name}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubText,
                        { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                      ]}
                    >
                      Supplier: {b.supplier_name || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardRightColumn}>
                    <Text
                      style={[
                        styles.stockText,
                        { color: isSelected ? '#FFFFFF' : theme.primary },
                      ]}
                    >
                      {b.remaining_quantity_base} {b.unit_symbol}
                    </Text>
                    <Text
                      style={[
                        styles.costText,
                        { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                      ]}
                    >
                      {formatCurrency(b.cost_per_base_unit)}/{b.unit_symbol}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={handleRestock}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>Restock Batch</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Batch Details View) ---
  const rightPanel = selectedBatch ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Layers size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedBatch.ingredient_name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.primary }]}>
              {selectedBatch.remaining_quantity_base} {selectedBatch.unit_symbol} remaining
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Batch Information</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Ingredient:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedBatch.ingredient_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Supplier:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedBatch.supplier_name || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Remaining Stock:</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              {selectedBatch.remaining_quantity_base} {selectedBatch.unit_symbol}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Initial Quantity:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedBatch.initial_quantity_base} {selectedBatch.unit_symbol}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Cost Per Unit:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {formatCurrency(selectedBatch.cost_per_base_unit)} / {selectedBatch.unit_symbol}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Received Date:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedBatch.received_date ? new Date(selectedBatch.received_date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {selectedBatch.expiration_date && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Expiration Date:</Text>
              <Text style={[styles.infoValue, { color: theme.error, fontWeight: '700' }]}>
                {new Date(selectedBatch.expiration_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Layers size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Batch Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select an inventory batch from the list to view its complete record details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Inventory" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedBatch}
        onBack={() => setSelectedBatch(null)}
        backButtonTitle="Back to Batches"
        childrenPadding={16}
      />
      <InventoryFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        mode="create"
      />
      <ProductRestockFormSheet
        visible={productFormVisible}
        onClose={() => setProductFormVisible(false)}
        onSubmit={handleProductFormSubmit}
        mode="create"
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
  batchCard: {
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
  cardRightColumn: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 14,
    fontWeight: '700',
  },
  costText: {
    fontSize: 12,
    marginTop: 2,
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
    fontWeight: '600',
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