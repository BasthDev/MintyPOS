import { DripButton } from '@/components/Button';
import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { ShoppingCart } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { theme } = useTheme();
  const { cart, getCartTotal, clearCart } = useStore();
  const cartTotal = getCartTotal();

  const [showCartMobile, setShowCartMobile] = useState(false);

  const leftPanel = (
    <View style={styles.posContent}>
      <Text style={[styles.welcomeText, { color: theme.text }]}>Welcome to MintyPOS</Text>
      <Text style={[styles.subtitleText, { color: theme.textSecondary }]}>
        Select products to add to cart
      </Text>

      <View style={styles.quickActions}>
        <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Today's Sales</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>Rp 0</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Orders</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>0</Text>
        </View>
      </View>

      <View style={styles.cartActionButtonContainer}>
        <DripButton
          title={`View Cart (${cart.length} items)`}
          icon={<ShoppingCart size={20} color="white" />}
          onPress={() => setShowCartMobile(true)}
          style={styles.viewCartButton}
        />
      </View>
    </View>
  );

  const rightPanel = (
    <View style={styles.cartPanel}>
      <View style={[styles.cartHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.cartTitle, { color: theme.text }]}>Current Order</Text>
        <Text style={[styles.cartCount, { color: theme.primary }]}>{cart.length} items</Text>
      </View>

      <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={48} color={theme.textTertiary || '#888'} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Cart is empty</Text>
          </View>
        ) : (
          cart.map((item) => (
            <View key={item.productId} style={[styles.cartItem, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: theme.textSecondary }]}>{formatCurrency(item.price)}</Text>
              </View>
              <View style={styles.itemQuantity}>
                <Text style={[styles.quantityText, { color: theme.primary }]}>x{item.quantity}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.cartFooter, { borderTopColor: theme.border }]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total</Text>
          <Text style={[styles.totalValue, { color: theme.primary }]}>{formatCurrency(cartTotal)}</Text>
        </View>
        {cart.length > 0 && (
          <DripButton
            title="Clear Cart"
            variant="danger"
            onPress={clearCart}
            style={{ marginTop: 12 }}
          />
        )}
      </View>
    </View>
  );

  return (
    <>
      <Header title="POS" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={showCartMobile}
        onBack={() => setShowCartMobile(false)}
        backButtonTitle="Back to Catalog"
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
    fontSize: 20,
    fontWeight: '700',
  },
  cartActionButtonContainer: {
    marginTop: 24,
  },
  viewCartButton: {
    width: '100%',
  },
  cartPanel: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cartCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  cartItems: {
    flex: 1,
    marginTop: 12,
  },
  emptyCart: {
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
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 12,
    marginTop: 2,
  },
  itemQuantity: {
    paddingHorizontal: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cartFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
