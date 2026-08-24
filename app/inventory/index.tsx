import { InventoryFormSheet } from '@/components/forms/InventoryFormSheet';
import { ProductRestockFormSheet } from '@/components/forms/ProductRestockFormSheet';
import { Layers, Package } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DripButton } from '../../components/Button';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { formatCurrency } from '../../lib/utils';
import { InventoryProcess } from '../../processes/inventoryProcess';

export default function InventoryScreen() {
  const { theme } = useTheme();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0 });
  const [formVisible, setFormVisible] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
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
      
      // Update product stock
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

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Inventory Management</Text>
      <Text style={styles.subtitle}>Track stock levels and restock items</Text>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.totalItems}</Text>
          <Text style={styles.statLabel}>Total Batches</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{formatCurrency(stats.totalValue)}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
      </View>

      <DripButton
        title="Restock Items"
        icon={<Layers size={20} color="white" />}
        onPress={handleRestock}
        style={styles.addButton}
      />

      <DripButton
        title="Restock Products"
        icon={<Package size={20} color="white" />}
        onPress={handleProductRestock}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.inventoryList}>
      <Text style={styles.listTitle}>Inventory Batches</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : batches.length === 0 ? (
        <View style={styles.emptyState}>
          <Layers size={48} color="#888" />
          <Text style={styles.emptyText}>No inventory records</Text>
          <Text style={styles.emptySubtext}>Restock items to build inventory</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {batches.map((batch) => (
            <View key={batch.id} style={[styles.batchItem, { borderColor: theme.border }]}>
              <View style={styles.batchInfo}>
                <Text style={[styles.ingredientName, { color: theme.text }]}>{batch.ingredient_name}</Text>
                <Text style={[styles.supplierName, { color: theme.textSecondary }]}>
                  Supplier: {batch.supplier_name}
                </Text>
              </View>
              <View style={styles.batchDetails}>
                <Text style={[styles.remainingStock, { color: theme.text }]}>
                  {batch.remaining_quantity_base} {batch.unit_symbol}
                </Text>
                <Text style={[styles.costPerUnit, { color: theme.textSecondary }]}>
                  {formatCurrency(batch.cost_per_base_unit)}/{batch.unit_symbol}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      <Header title="Inventory" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
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
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  addButton: {
    marginTop: 8,
  },
  inventoryList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  batchItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  batchInfo: {
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 12,
  },
  batchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingStock: {
    fontSize: 13,
    fontWeight: '600',
  },
  costPerUnit: {
    fontSize: 11,
  },
});