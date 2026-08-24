import { SupplierFormSheet } from '@/components/forms/SupplierFormSheet';
import { Edit, Plus, Trash2, Truck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../../components/Button';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { formatCurrency } from '../../lib/utils';
import { SupplierProcess } from '../../processes/supplierProcess';

export default function SuppliersScreen() {
  const { theme } = useTheme();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedSupplierStats, setSelectedSupplierStats] = useState<any>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const db = await getDatabase();
      const result = await SupplierProcess.getAll(db);
      if (result.success && result.data) {
        // Load stats for each supplier
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

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Suppliers Management</Text>
      <Text style={styles.subtitle}>Manage your suppliers and track orders</Text>
      
      <DripButton
        title="Add New Supplier"
        icon={<Plus size={20} color="white" />}
        onPress={handleAddSupplier}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.suppliersList}>
      <Text style={styles.listTitle}>Suppliers List</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : suppliers.length === 0 ? (
        <View style={styles.emptyState}>
          <Truck size={48} color="#888" />
          <Text style={styles.emptyText}>No suppliers yet</Text>
          <Text style={styles.emptySubtext}>Add your first supplier to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {suppliers.map((supplier) => (
            <View key={supplier.id} style={[styles.supplierItem, { borderColor: theme.border }]}>
              <View style={styles.supplierInfo}>
                <Text style={[styles.supplierName, { color: theme.text }]}>{supplier.name}</Text>
                {supplier.contact && (
                  <Text style={[styles.supplierContact, { color: theme.textSecondary }]}>
                    {supplier.contact}
                  </Text>
                )}
                {supplier.stats && (
                  <View style={styles.statsRow}>
                    <Text style={[styles.statText, { color: theme.textTertiary }]}>
                      {supplier.stats.totalBatches} orders
                    </Text>
                    <Text style={[styles.statText, { color: theme.textTertiary }]}>
                      {supplier.stats.ingredientCount} ingredients
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.supplierActions}>
                {supplier.stats && (
                  <View style={styles.valueInfo}>
                    <Text style={[styles.valueText, { color: theme.success }]}>
                      {formatCurrency(supplier.stats.totalValue)}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditSupplier(supplier)}
                >
                  <Edit size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteSupplier(supplier.id)}
                >
                  <Trash2 size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      <Header title="Suppliers" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
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
  addButton: {
    marginTop: 8,
  },
  suppliersList: {
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
  supplierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  supplierContact: {
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    fontSize: 11,
  },
  supplierActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueInfo: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
});