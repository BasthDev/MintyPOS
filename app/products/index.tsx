import { ProductFormSheet } from '@/components/forms/ProductFormSheet';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { calculateRecipeCost } from '@/lib/businessLogic';
import { getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { ProductProcess } from '@/processes/productProcess';
import { AlertTriangle, ChevronRight, Edit, Package, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProductsScreen() {
  const { theme } = useTheme();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  // Form sheet state
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await ProductProcess.getAll(db);
      if (result.success && result.data) {
        // Calculate dynamic HPP (Recipe cost or Buy price) and Margin for each product
        const productsWithHpp = await Promise.all(
          result.data.map(async (product: any) => {
            let hpp = product.buy_price || 0;
            if (product.recipe_definition_id) {
              const recipeCost = await calculateRecipeCost(db, product.recipe_definition_id);
              if (recipeCost > 0) {
                hpp = recipeCost;
              }
            }
            const sellingPrice = product.selling_price || 0;
            const margin = sellingPrice - hpp;
            const marginPercentage = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

            return {
              ...product,
              hpp,
              margin,
              marginPercentage,
            };
          })
        );

        setProducts(productsWithHpp);

        // If a product was selected, update its reference from fresh data
        if (selectedProduct) {
          const updated = productsWithHpp.find((p: any) => p.id === selectedProduct.id);
          setSelectedProduct(updated || null);
        }
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
      id: product.id,
      name: product.name,
      sku: product.sku || '',
      categoryId: product.category_id,
      buyPrice: product.buy_price,
      sellingPrice: product.selling_price,
      recipeDefinitionId: product.recipe_definition_id,
      stockDeductionMethod: product.stock_deduction_method || 'product',
      currentStock: product.current_stock || 0,
      recipeName: product.recipe_name,
      imageUri: product.image_uri,
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
                if (selectedProduct?.id === productId) {
                  setSelectedProduct(null);
                }
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
    stockDeductionMethod: 'product' | 'recipe' | 'none';
    currentStock: number;
    imageUri?: string;
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

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    const query = search.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(query);
    const skuMatch = p.sku?.toLowerCase().includes(query);
    const categoryMatch = p.category_name?.toLowerCase().includes(query);
    return nameMatch || skuMatch || categoryMatch;
  });

  // --- LEFT PANEL (Item list + Image + Dynamic HPP + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Package size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
            {search ? 'No products match your search' : 'No products found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {filteredProducts.map((p) => {
            const isSelected = selectedProduct?.id === p.id;
            const isLowStock = p.stock_deduction_method === 'product' && (p.current_stock || 0) <= 5;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.7}
                style={[
                  styles.productCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedProduct(p)}
              >
                <View style={styles.cardMain}>
                  {/* Product Image Thumbnail */}
                  <View style={[styles.thumbnailContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.input }]}>
                    {p.image_uri ? (
                      <Image source={{ uri: p.image_uri }} style={styles.productThumbnail} />
                    ) : (
                      <Package size={22} color={isSelected ? '#FFFFFF' : theme.primary} />
                    )}
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>

                    <Text
                      style={[
                        styles.cardPrice,
                        { color: isSelected ? '#E0F2FE' : theme.primary },
                      ]}
                    >
                      {formatCurrency(p.selling_price || 0)}
                    </Text>

                    {/* Dynamic HPP Cost */}
                    <View style={styles.hppRow}>
                      <Text
                        style={[
                          styles.hppBadgeText,
                          { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                        ]}
                      >
                        HPP: {formatCurrency(p.hpp ? Math.round(p.hpp) : 0)}
                      </Text>
                      {p.margin > 0 && (
                        <Text
                          style={[
                            styles.marginText,
                            { color: isSelected ? '#86EFAC' : theme.success },
                          ]}
                        >
                          ({Math.round(p.marginPercentage)}% margin)
                        </Text>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.cardSubText,
                        { color: isSelected ? '#CBD5E1' : theme.textTertiary },
                      ]}
                    >
                      {p.category_name || 'Uncategorized'} • SKU: {p.sku || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.cardRightColumn}>
                    {p.stock_deduction_method === 'product' && (
                      <View
                        style={[
                          styles.stockBadge,
                          {
                            backgroundColor: isSelected
                              ? 'rgba(255,255,255,0.2)'
                              : isLowStock
                              ? '#FEF2F2'
                              : theme.input,
                          },
                        ]}
                      >
                        {isLowStock && (
                          <AlertTriangle
                            size={12}
                            color={isSelected ? '#FFFFFF' : theme.error}
                            style={styles.stockAlertIcon}
                          />
                        )}
                        <Text
                          style={[
                            styles.stockText,
                            {
                              color: isSelected
                                ? '#FFFFFF'
                                : isLowStock
                                ? theme.error
                                : theme.text,
                            },
                          ]}
                        >
                          {p.current_stock || 0} pcs
                        </Text>
                      </View>
                    )}

                    <ChevronRight
                      size={20}
                      color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'}
                    />
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
        onPress={handleAddProduct}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Product</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Product Details View + Image + Dynamic HPP) ---
  const rightPanel = selectedProduct ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          {selectedProduct.image_uri ? (
            <Image source={{ uri: selectedProduct.image_uri }} style={styles.detailsHeroImage} />
          ) : (
            <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
              <Package size={28} color={theme.primary} />
            </View>
          )}
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedProduct.name}
            </Text>
            <Text style={[styles.detailsPrice, { color: theme.primary }]}>
              {formatCurrency(selectedProduct.selling_price || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsHeaderActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleEditProduct(selectedProduct)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDeleteProduct(selectedProduct.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Financial & HPP Overview</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Selling Price:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
              {formatCurrency(selectedProduct.selling_price || 0)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Dynamic HPP / COGS:</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              {formatCurrency(selectedProduct.hpp ? Math.round(selectedProduct.hpp) : 0)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Profit Margin:</Text>
            <Text style={[styles.infoValue, { color: theme.success, fontWeight: '700' }]}>
              {formatCurrency(selectedProduct.margin ? Math.round(selectedProduct.margin) : 0)} (
              {Math.round(selectedProduct.marginPercentage || 0)}%)
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Product Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>SKU:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedProduct.sku || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Category:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedProduct.category_name || 'Uncategorized'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Deduction Method:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedProduct.stock_deduction_method === 'recipe'
                ? 'Recipe Ingredients'
                : selectedProduct.stock_deduction_method === 'product'
                ? 'Direct Product Stock'
                : 'None'}
            </Text>
          </View>

          {selectedProduct.stock_deduction_method === 'product' && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Current Stock:</Text>
              <Text style={[styles.infoValue, { color: theme.text, fontWeight: '700' }]}>
                {selectedProduct.current_stock || 0} pcs
              </Text>
            </View>
          )}

          {selectedProduct.recipe_name && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Linked Recipe:</Text>
              <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '600' }]}>
                {selectedProduct.recipe_name}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Package size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Product Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a product from the list to view its complete details and HPP metrics.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Products" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedProduct}
        onBack={() => setSelectedProduct(null)}
        backButtonTitle="Back to Products"
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
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  hppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 2,
  },
  hppBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  marginText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardSubText: {
    fontSize: 11,
  },
  cardRightColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockAlertIcon: {
    marginRight: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
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
  detailsHeroImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    resizeMode: 'cover',
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
  detailsPrice: {
    fontSize: 16,
    fontWeight: '700',
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