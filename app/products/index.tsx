import { Edit, Package, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../../components/Button';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { ProductProcess } from '../../processes/productProcess';

import { ProductFormSheet } from '../../components/forms/ProductFormSheet';
export default function ProductsScreen() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, withRecipes: 0, simpleProducts: 0 });
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const db = await getDatabase();
      const result = await ProductProcess.getAll(db);
      if (result.success && result.data) {
        setProducts(result.data);
        setStats({
          total: result.data.length,
          withRecipes: result.data.filter((p: any) => p.recipe_definition_id).length,
          simpleProducts: result.data.filter((p: any) => !p.recipe_definition_id).length,
        });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleScannerOpen = () => {
    setEditingProduct(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct({
      name: product.name,
      sku: product.sku || '',
      categoryId: product.category_id,
      buyPrice: product.buy_price,
      sellingPrice: product.selling_price,
      recipeDefinitionId: product.recipe_definition_id,
      stockDeductionMethod: product.stock_deduction_method || 'product',
      currentStock: product.current_stock || 0,
      recipeName: product.recipe_name,
    });
    setFormMode('edit');
    setFormVisible(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await ProductProcess.delete(db, productId);
              if (result.success) {
                loadProducts();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Failed to delete product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: {
    name: string;
    sku: string;
    categoryId?: number;
    buyPrice?: number;
    sellingPrice: number;
    recipeDefinitionId?: number;
    stockDeductionMethod: 'product' | 'recipe';
    currentStock: number;
  }) => {
    try {
      const db = await getDatabase();
      let result;

      if (formMode === 'create') {
        result = await ProductProcess.create(db, data);
      } else {
        result = await ProductProcess.update(db, editingProduct.id, data);
      }

      if (result.success) {
        setFormVisible(false);
        loadProducts();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Products Management</Text>
      <Text style={styles.subtitle}>Manage your product catalog</Text>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.withRecipes}</Text>
          <Text style={styles.statLabel}>With Recipes</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.simpleProducts}</Text>
          <Text style={styles.statLabel}>Simple Products</Text>
        </View>
      </View>

      <DripButton
        title="Add New Product"
        icon={<Plus size={20} color="white" />}
        onPress={handleAddProduct}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.productsList}>
      <Text style={styles.listTitle}>Products List</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={48} color="#888" />
          <Text style={styles.emptyText}>No products yet</Text>
          <Text style={styles.emptySubtext}>Add your first product to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {products.map((product) => (
            <View key={product.id} style={[styles.productItem, { borderColor: theme.border }]}>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.text }]}>{product.name}</Text>
                {product.sku && (
                  <Text style={[styles.productSku, { color: theme.textTertiary }]}>
                    SKU: {product.sku}
                  </Text>
                )}
                {product.category_name && (
                  <Text style={[styles.productCategory, { color: theme.textSecondary }]}>
                    {product.category_name}
                  </Text>
                )}
                <Text style={[styles.productPrice, { color: theme.textSecondary }]}>
                  Rp {product.selling_price.toLocaleString()}
                </Text>
                {product.buy_price && (
                  <Text style={[styles.productBuyPrice, { color: theme.textTertiary }]}>
                    Cost: Rp {product.buy_price.toLocaleString()}
                  </Text>
                )}
                {product.recipe_name && (
                  <Text style={[styles.productRecipe, { color: theme.primary }]}>
                    Recipe: {product.recipe_name}
                  </Text>
                )}
                {product.stock_deduction_method === 'product' && (
                  <Text style={[styles.productStock, { color: theme.textSecondary }]}>
                    Stock: {product.current_stock || 0}
                  </Text>
                )}
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditProduct(product)}
                >
                  <Edit size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteProduct(product.id)}
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
      <Header title="Products" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
      <ProductFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingProduct}
        mode={formMode}
        onScannerOpen={handleScannerOpen}
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
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
  },
  addButton: {
    marginTop: 8,
  },
  productsList: {
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
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 11,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 11,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 12,
    marginBottom: 2,
  },
  productBuyPrice: {
    fontSize: 11,
    marginBottom: 2,
  },
  productStock: {
    fontSize: 11,
  },
  productRecipe: {
    fontSize: 11,
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
});