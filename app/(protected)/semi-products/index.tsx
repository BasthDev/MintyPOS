import { Header } from '@/components/Header';
import { SemiProductBatchFormSheet } from '@/components/forms/SemiProductBatchFormSheet';
import { SemiProductFormSheet } from '@/components/forms/SemiProductFormSheet';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase, SemiProduct, SemiProductBatch, SemiProductRecipe } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { SemiProductProcess } from '@/processes/semiProductProcess';
import {
  AlertTriangle,
  ChefHat,
  ChevronRight,
  Edit,
  Flame,
  History,
  Layers,
  Plus,
  Scale,
  Trash2,
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

export default function SemiProductsScreen() {
  const { theme } = useTheme();

  const [semiProducts, setSemiProducts] = useState<SemiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<SemiProduct | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<SemiProductRecipe[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<SemiProductBatch[]>([]);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingData, setEditingData] = useState<any>(null);

  const [batchVisible, setBatchVisible] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    loadSemiProducts();
  }, []);

  const loadSemiProducts = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await SemiProductProcess.getAll(db);
      if (result.success && result.data) {
        setSemiProducts(result.data);
        if (selectedProduct) {
          const updated = result.data.find((p) => p.id === selectedProduct.id);
          if (updated) {
            setSelectedProduct(updated);
            loadProductDetails(updated.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load semi-products:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (id: number) => {
    try {
      const db = await getDatabase();
      const [formulaRes, batchesRes] = await Promise.all([
        SemiProductProcess.getFormula(db, id),
        SemiProductProcess.getBatches(db, id),
      ]);
      if (formulaRes.success && formulaRes.data) {
        setSelectedFormula(formulaRes.data);
      }
      if (batchesRes.success && batchesRes.data) {
        setSelectedBatches(batchesRes.data);
      }
    } catch (e) {
      console.error('Failed to load semi-product details:', e);
    }
  };

  const handleSelectProduct = (sp: SemiProduct) => {
    setSelectedProduct(sp);
    loadProductDetails(sp.id);
  };

  const handleCreate = () => {
    setEditingData(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleEdit = (sp: SemiProduct) => {
    setEditingData({
      ...sp,
      ingredients: selectedFormula.map((f) => ({
        ingredient_id: f.ingredient_id,
        quantity_needed_base: f.quantity_needed_base,
      })),
    });
    setFormMode('edit');
    setFormVisible(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      const db = await getDatabase();
      let result;
      if (formMode === 'create') {
        result = await SemiProductProcess.create(db, data);
      } else {
        result = await SemiProductProcess.update(db, selectedProduct!.id, data);
      }

      if (result.success) {
        setFormVisible(false);
        await loadSemiProducts();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Failed to save');
      }
    } catch (e) {
      console.error('Failed to save semi-product:', e);
      Alert.alert('Error', 'Failed to save semi-product');
    }
  };

  const handleProduceBatch = (sp: SemiProduct) => {
    setSelectedProduct(sp);
    setBatchVisible(true);
  };

  const handleBatchSubmit = async (data: {
    semiProductId: number;
    targetProducedBaseQty: number;
    notes?: string;
  }) => {
    setBatchLoading(true);
    try {
      const db = await getDatabase();
      const result = await SemiProductProcess.executeBatch(
        db,
        data.semiProductId,
        data.targetProducedBaseQty,
        data.notes
      );

      if (result.success && result.data) {
        setBatchVisible(false);
        Alert.alert(
          'Batch Production Successful',
          `Produced ${data.targetProducedBaseQty} ${selectedProduct?.base_unit_symbol || 'unit'} at HPP ${formatCurrency(result.data.costPerBaseUnit)}/${selectedProduct?.base_unit_symbol || 'unit'}!\nRaw ingredients deducted via FIFO.`
        );
        await loadSemiProducts();
      } else {
        Alert.alert('Production Failed', result.errors?.join(', ') || result.error || 'Failed to execute batch');
      }
    } catch (e: any) {
      console.error('Failed to execute batch:', e);
      Alert.alert('Error', e.message || 'Failed to execute batch');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Semi-Product',
      'Are you sure you want to delete this semi-finished product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await SemiProductProcess.delete(db, id);
              if (result.success) {
                if (selectedProduct?.id === id) setSelectedProduct(null);
                loadSemiProducts();
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete semi-product');
            }
          },
        },
      ]
    );
  };

  const filteredProducts = semiProducts.filter((p) => {
    const query = search.toLowerCase();
    return p.name.toLowerCase().includes(query) || (p.code && p.code.toLowerCase().includes(query));
  });

  // --- LEFT PANEL ---
  const leftPanel = (
    <View style={styles.leftContainer}>
      <DripSearchBar
        placeholder="Search semi-finished products..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Layers size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {search ? 'No semi-products match your search' : 'No semi-finished products registered'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {filteredProducts.map((p) => {
            const isSelected = selectedProduct?.id === p.id;
            const isLowStock = p.minimum_stock > 0 && p.current_stock <= p.minimum_stock;
            const isOutOfStock = p.current_stock === 0;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleSelectProduct(p)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: isSelected ? '#FFFFFF' : theme.text }]}>
                      {p.name}
                    </Text>
                    {p.code && (
                      <Text style={[styles.cardCode, { color: isSelected ? '#E0F2FE' : theme.textSecondary }]}>
                        Code: {p.code}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.cardStock,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isOutOfStock
                            ? theme.error
                            : isLowStock
                            ? '#F59E0B'
                            : theme.primary,
                        },
                      ]}
                    >
                      {p.current_stock} {p.base_unit_symbol}
                    </Text>
                    <Text style={[styles.cardHpp, { color: isSelected ? '#CBD5E1' : theme.textTertiary }]}>
                      HPP ~ {formatCurrency(p.estimated_cost_per_unit || 0)}/{p.base_unit_symbol}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <Text style={[styles.cardMeta, { color: isSelected ? '#CBD5E1' : theme.textTertiary }]}>
                    Yield standard: {p.yield_quantity} {p.base_unit_symbol} • {p.formula_ingredients_count || 0} raw ingredients
                  </Text>
                  <ChevronRight size={18} color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'} />
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
        <Text style={styles.fabText}>New Semi-Product</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Details) ---
  const rightPanel = selectedProduct ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Layers size={28} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>{selectedProduct.name}</Text>
            <Text style={[styles.detailsSubtitle, { color: theme.primary }]}>
              Current Stock: {selectedProduct.current_stock} {selectedProduct.base_unit_symbol || 'unit'} • Estimated HPP: {formatCurrency(selectedProduct.estimated_cost_per_unit || 0)}/{selectedProduct.base_unit_symbol || 'unit'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.produceBtn, { backgroundColor: '#F59E0B' }]}
            onPress={() => handleProduceBatch(selectedProduct)}
          >
            <Flame size={16} color="#FFFFFF" />
            <Text style={styles.produceBtnText}>Produce Batch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleEdit(selectedProduct)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDelete(selectedProduct.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>Item Specification</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>SKU / Code:</Text>
            <Text style={[styles.infoVal, { color: theme.text }]}>{selectedProduct.code || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Base Output Unit:</Text>
            <Text style={[styles.infoVal, { color: theme.text }]}>{selectedProduct.base_unit_name} ({selectedProduct.base_unit_symbol})</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Standard Recipe Yield:</Text>
            <Text style={[styles.infoVal, { color: theme.text, fontWeight: '700' }]}>
              {selectedProduct.yield_quantity} {selectedProduct.base_unit_symbol}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Minimum Stock Alert:</Text>
            <Text style={[styles.infoVal, { color: theme.text }]}>
              {selectedProduct.minimum_stock} {selectedProduct.base_unit_symbol}
            </Text>
          </View>
        </View>

        {/* Formula Breakdown */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
          <View style={styles.cardHeaderWithAction}>
            <View>
              <Text style={[styles.infoTitle, { color: theme.text }]}>
                Recipe Formulation ({selectedFormula.length} components)
              </Text>
              <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
                Standard ingredients needed per {selectedProduct.yield_quantity} {selectedProduct.base_unit_symbol}:
              </Text>
            </View>
          </View>

          {selectedFormula.map((comp, idx) => (
            <View key={idx} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.text }]}>{comp.ingredient_name}</Text>
                <Text style={[styles.itemQty, { color: theme.textSecondary }]}>
                  {comp.quantity_needed_base} {comp.unit_symbol} @ Rp {(comp.cost_per_unit || 0).toFixed(2)}/{comp.unit_symbol}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: theme.primary }]}>
                {formatCurrency(comp.component_cost || 0)}
              </Text>
            </View>
          ))}

          <View style={styles.grandTotalRow}>
            <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Total Formula Cost:</Text>
            <Text style={[styles.grandTotalVal, { color: theme.primary }]}>
              {formatCurrency(selectedFormula.reduce((sum, c) => sum + (c.component_cost || 0), 0))}
            </Text>
          </View>
        </View>

        {/* Produced Batches History */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12, marginBottom: 20 }]}>
          <View style={styles.cardHeaderWithAction}>
            <History size={18} color={theme.primary} />
            <Text style={[styles.infoTitle, { color: theme.text, marginBottom: 0 }]}>
              Batch Inventory ({selectedBatches.length} batches)
            </Text>
          </View>

          {selectedBatches.length === 0 ? (
            <Text style={[styles.emptyBatchText, { color: theme.textSecondary }]}>
              No production batches recorded yet. Click "Produce Batch" to cook and record stock.
            </Text>
          ) : (
            selectedBatches.map((b) => (
              <View key={b.id} style={[styles.batchRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.batchNum, { color: theme.text }]}>{b.batch_number}</Text>
                  <Text style={[styles.batchDate, { color: theme.textSecondary }]}>
                    Produced: {new Date(b.produced_date).toLocaleString()}
                  </Text>
                  {b.notes && (
                    <Text style={[styles.batchNotes, { color: theme.textTertiary }]}>{b.notes}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.batchStock, { color: theme.primary }]}>
                    {b.remaining_quantity_base} / {b.initial_quantity_base} {b.unit_symbol}
                  </Text>
                  <Text style={[styles.batchCost, { color: theme.textSecondary }]}>
                    HPP: Rp {b.cost_per_base_unit.toFixed(2)}/{b.unit_symbol}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetails}>
      <Layers size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Semi-Product Selected</Text>
      <Text style={[styles.emptyDetailsSub, { color: theme.textSecondary }]}>
        Select a semi-finished product from the list to view formulation, execute batch production, and see batch history.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Semi-Products" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedProduct}
        onBack={() => setSelectedProduct(null)}
        backButtonTitle="Back to Semi-Products"
        childrenPadding={16}
      />
      <SemiProductFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingData}
        mode={formMode}
      />
      <SemiProductBatchFormSheet
        visible={batchVisible}
        onClose={() => setBatchVisible(false)}
        semiProduct={selectedProduct}
        onSubmit={handleBatchSubmit}
        loading={batchLoading}
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
    marginBottom: 12,
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardCode: {
    fontSize: 12,
    marginTop: 2,
  },
  cardStock: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardHpp: {
    fontSize: 11,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 11,
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
  detailsTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailsSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  produceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  produceBtnText: {
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
  cardHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 10,
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
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBatchText: {
    fontSize: 13,
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  batchNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  batchDate: {
    fontSize: 11,
    marginTop: 2,
  },
  batchNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  batchStock: {
    fontSize: 13,
    fontWeight: '700',
  },
  batchCost: {
    fontSize: 11,
    marginTop: 2,
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
