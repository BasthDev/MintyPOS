import { DripContainer } from '@/components/Container';
import { Header } from '@/components/Header';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { cart, getCartTotal, clearCart } = useStore();
  const cartTotal = getCartTotal();

  const leftPanel = (
    <View style={styles.posContent}>
      <Text style={styles.welcomeText}>Welcome to MintyPOS</Text>
      <Text style={styles.subtitleText}>Select products to add to cart</Text>
      
      <View style={styles.quickActions}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today's Sales</Text>
          <Text style={styles.statValue}>Rp 0</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
      </View>
    </View>
  );

  const rightPanel = (
    <View style={styles.cartPanel}>
      <View style={styles.cartHeader}>
        <Text style={styles.cartTitle}>Current Order</Text>
        <Text style={styles.cartCount}>{cart.length} items</Text>
      </View>
      
      <ScrollView style={styles.cartItems}>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={48} color="#888" />
            <Text style={styles.emptyText}>Cart is empty</Text>
          </View>
        ) : (
          cart.map((item) => (
            <View key={item.productId} style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
              </View>
              <View style={styles.itemQuantity}>
                <Text style={styles.quantityText}>x{item.quantity}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.cartFooter}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(cartTotal)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Header title="POS" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  posContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    marginBottom: 24,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  cartPanel: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cartCount: {
    fontSize: 14,
  },
  cartItems: {
    flex: 1,
  },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
  },
  itemQuantity: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cartFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
