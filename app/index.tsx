import { DripButton } from '@/components/Button';
import { DripChip } from '@/components/Chip';
import { Header } from '@/components/Header';
import { DripScannerModal } from '@/components/ScannerModal';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { DripStepper } from '@/components/Stepper';
import { DripToast } from '@/components/Toast';
import { useTheme } from '@/constants/colorTheme';
import {
  Category,
  dbOperations,
  getDatabase,
} from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { CartProcess } from '@/processes/cartProcess';
import { useStore } from '@/store/useStore';
import { router, useFocusEffect } from 'expo-router';
import {
  CreditCard,
  Package,
  ScanLine,
  ShoppingCart,
  Trash2
} from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export default function POSScreen() {
  const { theme } = useTheme();
  const { cart, getCartTotal } = useStore();
  const { width } = useWindowDimensions();
  const isWide = width >= 768; // Tablet/Desktop breakpoint

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Stats
  const [todayStats, setTodayStats] = useState({ totalSales: 0, orderCount: 0 });

  // UI state
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTitle, setToastTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const [prodList, catList, stats] = await Promise.all([
        dbOperations.getAllProducts(db),
        dbOperations.getAllCategories(db),
        dbOperations.getTodaysSalesStats(db),
      ]);
      setProducts(prodList);
      setCategories(catList);
      setTodayStats(stats);
    } catch (error) {
      console.error('Failed to load POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const showToastNotification = (title: string, message: string) => {
    setToastTitle(title);
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleAddToCart = (product: any) => {
    const res = CartProcess.addItem({
      productId: product.id,
      name: product.name,
      price: product.selling_price || product.price,
      quantity: 1,
      hasRecipe: !!product.recipe_definition_id,
    });

    if (res.success) {
      const currentItem = (res.data || cart).find((c) => c.productId === product.id);
      const newQty = currentItem?.quantity || 1;
      showToastNotification('Item Added', `${product.name} added (x${newQty})`);
    }
  };

  // Filter products by category and search (name and SKU)
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === null || p.category_id === selectedCategory;
      const matchesSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const lastActionTimeRef = useRef<number>(0);

  const checkDebounce = (): boolean => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 600) {
      return false; // Suppress duplicate rapid trigger
    }
    lastActionTimeRef.current = now;
    return true;
  };

  // Handle Enter / OK / Selesai on Keyboard for Search Bar
  const handleSearchSubmit = () => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    if (!checkDebounce()) return;

    // 1. Look for exact SKU match first
    const exactSku = products.find((p) => p.sku && p.sku.toLowerCase() === query);
    if (exactSku) {
      handleAddToCart(exactSku);
      setSearch('');
      return;
    }

    // 2. If filtered items has exactly 1 match
    if (filteredProducts.length === 1) {
      handleAddToCart(filteredProducts[0]);
      setSearch('');
      return;
    }
  };

  // Handle Camera Barcode Scanner success (Bypasses keyboard confirm/OK to prevent double adding)
  const handleScanSuccess = (scannedCode: string) => {
    setScannerVisible(false);
    if (!checkDebounce()) return;

    const query = scannedCode.trim().toLowerCase();
    const exactSku = products.find((p) => p.sku && p.sku.toLowerCase() === query);
    if (exactSku) {
      handleAddToCart(exactSku);
      setSearch('');
    } else {
      setSearch(scannedCode);
      showToastNotification('Barcode Scanned', `Scanned code: ${scannedCode}`);
    }
  };

  const cartTotal = getCartTotal();

  // --- LEFT PANEL (Product Catalog Grid + Stats + Categories) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      {/* Top Stats */}
      <View style={styles.topStatsRow}>
        <View style={[styles.statBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Today's Sales</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>
            {formatCurrency(todayStats.totalSales)}
          </Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Orders</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{todayStats.orderCount}</Text>
        </View>
      </View>

      {/* DripSearchBar with SKU search, submit listener & scanner modal trigger */}
      <DripSearchBar
        placeholder="Search product name or SKU / Barcode..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        onSubmitEditing={handleSearchSubmit}
        returnKeyType="done"
        rightIcon={<ScanLine size={20} color={theme.primary} />}
        onRightIconPress={() => setScannerVisible(true)}
        style={styles.searchBar}
      />

      {/* Category Filter Chips using DripChip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <DripChip
          label={`All Items (${products.length})`}
          selected={selectedCategory === null}
          onPress={() => setSelectedCategory(null)}
        />

        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;

          return (
            <DripChip
              key={cat.id}
              label={`${cat.name} (${count})`}
              selected={selectedCategory === cat.id}
              onPress={() => setSelectedCategory(cat.id)}
            />
          );
        })}
      </ScrollView>

      {/* Products Grid */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyProducts}>
          <Package size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyProductsTitle, { color: theme.text }]}>No products found</Text>
          <Text style={[styles.emptyProductsSub, { color: theme.textSecondary }]}>
            {search ? 'Press Enter if searching by SKU or try another keyword' : 'Add products in the Products screen'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.catalogScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.catalogGrid}>
            {filteredProducts.map((product) => {
              const inCartItem = cart.find((c) => c.productId === product.id);
              const cartQty = inCartItem?.quantity || 0;

              return (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.7}
                  style={[
                    styles.productCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    cartQty > 0 && { borderColor: theme.primary, borderWidth: 2 },
                  ]}
                  onPress={() => handleAddToCart(product)}
                >
                  {/* Product Image Thumbnail or Icon */}
                  {product.image_uri ? (
                    <Image source={{ uri: product.image_uri }} style={styles.productThumbnail} />
                  ) : (
                    <View style={[styles.productIconBox, { backgroundColor: theme.input }]}>
                      <Package size={28} color={theme.primary} />
                    </View>
                  )}

                  {/* Quantity In Cart Badge */}
                  {cartQty > 0 && (
                    <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.cartBadgeText}>{cartQty}</Text>
                    </View>
                  )}

                  <View style={styles.productMeta}>
                    <Text
                      style={[styles.productName, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>
                    {product.sku ? (
                      <Text style={[styles.productSku, { color: theme.textTertiary || '#888' }]}>
                        SKU: {product.sku}
                      </Text>
                    ) : null}
                    <Text style={[styles.productPrice, { color: theme.primary }]}>
                      {formatCurrency(product.selling_price || product.price)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Mobile Floating Cart Summary Button - Only show on mobile */}
      {!isWide && cart.length > 0 && (
        <View style={styles.mobileCartTrigger}>
          <DripButton
            title={`View Order (${cart.length} items • ${formatCurrency(cartTotal)})`}
            icon={<ShoppingCart size={20} color="#FFFFFF" />}
            onPress={() => setShowCartMobile(true)}
          />
        </View>
      )}
    </View>
  );

  const handleClearCart = () => {
    CartProcess.clearCart();
    showToastNotification('Cart Cleared', 'All items removed from current order');
  };

  // --- RIGHT PANEL (Cart Panel & Checkout Controls) ---
  const rightPanel = (
    <View style={styles.cartPanel}>
      <View style={[styles.cartHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.cartHeaderLeft}>
          <ShoppingCart size={22} color={theme.primary} />
          <Text style={[styles.cartTitle, { color: theme.text }]}>Current Order</Text>
        </View>
        <Text style={[styles.cartCount, { color: theme.primary }]}>
          {cart.length} item{cart.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView style={styles.cartItemsScroll} showsVerticalScrollIndicator={false}>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={48} color={theme.textTertiary || '#888'} />
            <Text style={[styles.emptyCartTitle, { color: theme.text }]}>Cart is empty</Text>
            <Text style={[styles.emptyCartSub, { color: theme.textSecondary }]}>
              Tap products from the catalog or scan barcodes to add items
            </Text>
          </View>
        ) : (
          cart.map((item) => (
            <View
              key={item.productId}
              style={[
                styles.cartItemCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.cartItemLeft}>
                <Text style={[styles.cartItemName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.cartItemUnitCost, { color: theme.textSecondary }]}>
                  {formatCurrency(item.price)} each
                </Text>
              </View>

              <View style={styles.cartItemRight}>
                <Text style={[styles.cartItemTotal, { color: theme.primary }]}>
                  {formatCurrency(item.price * item.quantity)}
                </Text>

                <View style={styles.cartItemActions}>
                  {/* Quantity Adjusters - Using DripStepper */}
                  <DripStepper
                    value={item.quantity}
                    onValueChange={(newQty) => {
                      if (newQty === 0) {
                        CartProcess.removeItem(item.productId);
                        showToastNotification('Item Removed', `${item.name} removed from order`);
                      } else {
                        CartProcess.updateQuantity(item.productId, newQty);
                        showToastNotification('Cart Updated', `${item.name} (x${newQty})`);
                      }
                    }}
                    min={0}
                    max={99}
                    step={1}
                    style={styles.cartStepper}
                  />

                  <TouchableOpacity
                    style={styles.cartItemDelete}
                    onPress={() => {
                      CartProcess.removeItem(item.productId);
                      showToastNotification('Item Removed', `${item.name} removed from order`);
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Cart Summary & Pay Button */}
      {cart.length > 0 && (
        <View style={[styles.cartFooter, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.footerSummaryRow}>
            <Text style={[styles.footerSubLabel, { color: theme.textSecondary }]}>Subtotal:</Text>
            <Text style={[styles.footerSubVal, { color: theme.text }]}>
              {formatCurrency(cartTotal)}
            </Text>
          </View>

          <View style={styles.footerActionsRow}>
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: theme.border }]}
              onPress={handleClearCart}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.payButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/pos/payment')}
            >
              <CreditCard size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Charge {formatCurrency(cartTotal)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Header title="POS" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!isWide && showCartMobile}
        onBack={() => setShowCartMobile(false)}
        backButtonTitle="Back to Catalog"
        childrenPadding={16}
      />

      {/* DripToast Notification */}
      <DripToast
        visible={toastVisible}
        title={toastTitle}
        message={toastMessage}
        type="success"
        onClose={() => setToastVisible(false)}
      />

      {/* Camera Barcode Scanner Modal */}
      <DripScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
    position: 'relative',
  },
  topStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statBadge: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  searchBar: {
    marginTop: 8,
    marginBottom: 8,
  },
  categoryScroll: {
    maxHeight: 46,
    marginBottom: 10,
  },
  categoryContainer: {
    gap: 8,
    paddingRight: 16,
    alignItems: 'center',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyProducts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyProductsSub: {
    fontSize: 13,
    marginTop: 4,
  },
  catalogScroll: {
    flex: 1,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  productCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  productThumbnail: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  productIconBox: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  productMeta: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    height: 36,
  },
  productSku: {
    fontSize: 11,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  productStepperContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  productStepper: {
    height: 32,
  },
  mobileCartTrigger: {
    marginTop: 12,
  },

  // Cart Panel
  cartPanel: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cartCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartItemsScroll: {
    flex: 1,
    marginTop: 12,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyCartTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyCartSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  cartItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  cartItemLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cartItemUnitCost: {
    fontSize: 12,
    marginTop: 2,
  },
  cartItemRight: {
    alignItems: 'flex-end',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartItemDelete: {
    padding: 8,
  },
  cartStepper: {
    height: 36,
  },

  // Cart Footer
  cartFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerSubLabel: {
    fontSize: 14,
  },
  footerSubVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  clearBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
