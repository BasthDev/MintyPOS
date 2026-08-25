import { Header } from '@/components/Header';
import { useTheme } from '@/constants/colorTheme';
import {
  CompletedOrder,
  dbOperations,
  DiscountItem,
  getDatabase,
  handleCheckoutOrder,
  PaymentMethodItem,
  TaxConfigItem,
} from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { CartProcess } from '@/processes/cartProcess';
import { useStore } from '@/store/useStore';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  QrCode,
  Receipt,
  ShoppingCart,
  Tag,
  Wallet,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

export default function POSPaymentScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { cart } = useStore();

  // Loaded database configs
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfigItem[]>([]);
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Selected payment options
  const [activeTab, setActiveTab] = useState<string>('cash');
  const [selectedMethodName, setSelectedMethodName] = useState<string>('Cash');

  // Discount selection
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountItem | null>(null);
  const [showDiscountPicker, setShowDiscountPicker] = useState(false);

  // Cash numpad
  const [numpadStr, setNumpadStr] = useState<string>('');

  // Processing state
  const [processing, setProcessing] = useState(false);

  // Success modal
  const [successOrder, setSuccessOrder] = useState<CompletedOrder | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    try {
      const db = await getDatabase();
      const [methods, taxes, disc] = await Promise.all([
        dbOperations.getActivePaymentMethods(db),
        dbOperations.getActiveTaxConfigs(db),
        dbOperations.getActiveDiscounts(db),
      ]);
      setPaymentMethods(methods);
      setTaxConfigs(taxes);
      setDiscounts(disc);
    } catch (error) {
      console.error('Failed to load payment configs:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // 1. Calculate Subtotal
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // 2. Calculate Discount Amount
  const discountAmount = useMemo(() => {
    if (!selectedDiscount) return 0;
    if (selectedDiscount.min_order_amount && subtotal < selectedDiscount.min_order_amount) {
      return 0;
    }
    if (selectedDiscount.type === 'percentage') {
      const raw = (subtotal * selectedDiscount.value) / 100;
      if (selectedDiscount.max_discount_amount && raw > selectedDiscount.max_discount_amount) {
        return selectedDiscount.max_discount_amount;
      }
      return raw;
    }
    return Math.min(selectedDiscount.value, subtotal);
  }, [selectedDiscount, subtotal]);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // 3. Calculate Taxes and Service Charges
  const { totalTax, totalService, taxBreakdown } = useMemo(() => {
    let tTax = 0;
    let tService = 0;
    const breakdown: Array<{ name: string; amount: number; rate: number; type: string }> = [];

    taxConfigs.forEach((t) => {
      let amount = 0;
      if (t.type === 'percentage') {
        amount = (discountedSubtotal * t.rate) / 100;
      } else {
        amount = t.rate;
      }

      if (t.name.toLowerCase().includes('service')) {
        tService += amount;
      } else {
        tTax += amount;
      }

      breakdown.push({
        name: t.name,
        amount,
        rate: t.rate,
        type: t.type,
      });
    });

    return { totalTax: tTax, totalService: tService, taxBreakdown: breakdown };
  }, [taxConfigs, discountedSubtotal]);

  // 4. Net Total
  const finalTotal = Math.round(discountedSubtotal + totalTax + totalService);

  // Cash Amount Paid & Change
  const cashPaid = parseInt(numpadStr || '0', 10);
  const changeAmount = activeTab === 'cash' ? Math.max(0, cashPaid - finalTotal) : 0;
  const isCashSufficient = activeTab === 'cash' ? cashPaid >= finalTotal : true;

  // Payment Categories from active methods
  const paymentTypes = useMemo(() => {
    const typesMap: Record<string, { key: string; label: string; methods: PaymentMethodItem[] }> = {
      cash: { key: 'cash', label: 'Cash', methods: [] },
    };

    paymentMethods.forEach((m) => {
      if (!typesMap[m.type_key]) {
        typesMap[m.type_key] = {
          key: m.type_key,
          label: m.type_label,
          methods: [],
        };
      }
      typesMap[m.type_key].methods.push(m);
    });

    return Object.values(typesMap);
  }, [paymentMethods]);

  // Handle Numpad Key Press
  const handleNumpadKey = (key: string) => {
    if (key === '⌫') {
      setNumpadStr((prev) => prev.slice(0, -1));
    } else if (key === '000') {
      if (numpadStr && numpadStr.length < 9) {
        setNumpadStr((prev) => prev + '000');
      }
    } else {
      if (numpadStr.length < 10) {
        setNumpadStr((prev) => (prev === '0' ? key : prev + key));
      }
    }
  };

  const handleQuickAmount = (amount: number) => {
    setNumpadStr(amount.toString());
  };

  // Execute Checkout Transaction into SQLite database
  const handleConfirmPayment = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Order', 'Cart is empty. Please add products before checking out.');
      return;
    }

    if (activeTab === 'cash' && !isCashSufficient) {
      Alert.alert(
        'Insufficient Cash',
        `Amount paid (${formatCurrency(cashPaid)}) is less than total (${formatCurrency(finalTotal)})`
      );
      return;
    }

    if (activeTab !== 'cash' && !selectedMethodName) {
      Alert.alert('Select Method', 'Please select a payment provider or bank.');
      return;
    }

    setProcessing(true);
    try {
      const db = await getDatabase();
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const amountPaid = activeTab === 'cash' ? cashPaid : finalTotal;

      // 1. Process FIFO/FEFO stock deductions for cart items
      await handleCheckoutOrder(
        db,
        cart.map((c) => ({
          productId: c.productId,
          quantitySold: c.quantity,
        }))
      );

      // 2. Create Completed Order record in SQLite Database
      const orderId = await dbOperations.createCompletedOrder(db, {
        orderNumber,
        subtotal,
        discountAmount,
        discountName: selectedDiscount?.name || null,
        taxAmount: totalTax,
        serviceAmount: totalService,
        total: finalTotal,
        paymentType: activeTab,
        paymentMethod: selectedMethodName,
        amountPaid,
        changeAmount,
        items: cart.map((c) => ({
          productId: c.productId,
          productName: c.name,
          price: c.price,
          quantity: c.quantity,
          subtotal: c.price * c.quantity,
        })),
      });

      const completedOrder: CompletedOrder = {
        id: orderId,
        order_number: orderNumber,
        subtotal,
        discount_amount: discountAmount,
        discount_name: selectedDiscount?.name || null,
        tax_amount: totalTax,
        service_amount: totalService,
        total: finalTotal,
        payment_type: activeTab,
        payment_method: selectedMethodName,
        amount_paid: amountPaid,
        change_amount: changeAmount,
        items_count: cart.length,
        created_at: new Date().toISOString(),
        items: cart.map((c, idx) => ({
          id: idx,
          order_id: orderId,
          product_id: c.productId,
          product_name: c.name,
          price: c.price,
          quantity: c.quantity,
          subtotal: c.price * c.quantity,
        })),
      };

      // 3. Clear temporary Zustand cart
      CartProcess.clearCart();
      setSuccessOrder(completedOrder);
    } catch (error: any) {
      console.error('Payment checkout failed:', error);
      Alert.alert('Checkout Failed', error.message || 'Failed to complete transaction');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinishNewSale = () => {
    setSuccessOrder(null);
    router.replace('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Header title="Payment Checkout" />

      {loadingConfigs ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading payment options...
          </Text>
        </View>
      ) : (
        <View style={[styles.mainLayout, isTablet ? styles.tabletRow : styles.mobileCol]}>
          {/* LEFT PANEL: ORDER SUMMARY & DISCOUNTS / TAX BREAKDOWN */}
          <View
            style={[
              styles.summarySection,
              isTablet ? styles.summaryTablet : styles.summaryMobile,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.summaryHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Order Summary</Text>
              <Text style={[styles.itemCountText, { color: theme.primary }]}>
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Items List Mini Scroll */}
            <ScrollView style={styles.itemsMiniList} showsVerticalScrollIndicator={false}>
              {cart.length === 0 ? (
                <Text style={[styles.emptyCartNote, { color: theme.textSecondary }]}>
                  No items in order
                </Text>
              ) : (
                cart.map((item) => (
                  <View key={item.productId} style={styles.itemRow}>
                    <Text style={[styles.itemNameText, { color: theme.text }]} numberOfLines={1}>
                      {item.quantity}x {item.name}
                    </Text>
                    <Text style={[styles.itemPriceText, { color: theme.textSecondary }]}>
                      {formatCurrency(item.price * item.quantity)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Subtotal */}
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: theme.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.calcVal, { color: theme.text }]}>{formatCurrency(subtotal)}</Text>
            </View>

            {/* Discount Selector Trigger */}
            <TouchableOpacity
              style={[
                styles.discountSelector,
                {
                  borderColor: selectedDiscount ? theme.primary : theme.border,
                  backgroundColor: selectedDiscount ? theme.primary + '10' : theme.background,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setShowDiscountPicker(true)}
            >
              <View style={styles.discountSelectorLeft}>
                <Tag size={16} color={selectedDiscount ? theme.primary : theme.textSecondary} />
                <Text
                  style={[
                    styles.discountSelectorTitle,
                    { color: selectedDiscount ? theme.primary : theme.text },
                  ]}
                >
                  {selectedDiscount ? selectedDiscount.name : 'Apply Discount / Voucher'}
                </Text>
              </View>
              {selectedDiscount ? (
                <Text style={[styles.discountAmountText, { color: theme.error }]}>
                  -{formatCurrency(discountAmount)}
                </Text>
              ) : (
                <ChevronDown size={18} color={theme.textSecondary} />
              )}
            </TouchableOpacity>

            {/* Taxes & Service Charges Breakdown */}
            {taxBreakdown.map((t, idx) => (
              <View key={idx} style={styles.calcRow}>
                <Text style={[styles.calcLabel, { color: theme.textSecondary }]}>
                  {t.name} {t.type === 'percentage' ? `(${t.rate}%)` : ''}
                </Text>
                <Text style={[styles.calcVal, { color: theme.text }]}>
                  +{formatCurrency(t.amount)}
                </Text>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Net Total */}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total Due</Text>
              <Text style={[styles.totalValue, { color: theme.primary }]}>
                {formatCurrency(finalTotal)}
              </Text>
            </View>
          </View>

          {/* RIGHT PANEL: PAYMENT METHOD TABS & NUMPAD / PROVIDER GRIDS */}
          <View style={styles.paymentSection}>
            {/* Payment Method Selector Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContainer}
            >
              {paymentTypes.map((type) => {
                const isTabActive = activeTab === type.key;
                let IconComp = Banknote;
                if (type.key === 'qris') IconComp = QrCode;
                else if (type.key === 'transfer') IconComp = CreditCard;
                else if (type.key === 'ewallet') IconComp = Wallet;

                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.paymentTab,
                      { borderColor: theme.border, backgroundColor: theme.card },
                      isTabActive && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => {
                      setActiveTab(type.key);
                      if (type.key === 'cash') {
                        setSelectedMethodName('Cash');
                      } else if (type.methods.length > 0) {
                        setSelectedMethodName(type.methods[0].method_name);
                      }
                    }}
                  >
                    <IconComp size={18} color={isTabActive ? '#FFFFFF' : theme.textSecondary} />
                    <Text
                      style={[
                        styles.tabText,
                        { color: isTabActive ? '#FFFFFF' : theme.textSecondary },
                        isTabActive && { fontWeight: '700' },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* TAB CONTENT: CASH */}
            {activeTab === 'cash' && (
              <ScrollView style={styles.cashContent} showsVerticalScrollIndicator={false}>
                {/* Amount Display & Change Box */}
                <View style={[styles.amountDisplayCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.amountDisplayRow}>
                    <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Amount Paid:</Text>
                    <Text style={[styles.amountValue, { color: theme.text }]}>
                      {formatCurrency(cashPaid)}
                    </Text>
                  </View>

                  <View style={styles.amountDisplayRow}>
                    <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Change (Kembalian):</Text>
                    <Text
                      style={[
                        styles.changeValue,
                        { color: isCashSufficient ? theme.success || '#16A34A' : theme.error },
                      ]}
                    >
                      {isCashSufficient
                        ? formatCurrency(changeAmount)
                        : `Kurang ${formatCurrency(finalTotal - cashPaid)}`}
                    </Text>
                  </View>
                </View>

                {/* Quick Cash Chips */}
                <View style={styles.quickChipsGrid}>
                  <TouchableOpacity
                    style={[styles.quickChip, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
                    onPress={() => handleQuickAmount(finalTotal)}
                  >
                    <Text style={[styles.quickChipText, { color: theme.primary, fontWeight: '700' }]}>
                      Uang Pas
                    </Text>
                  </TouchableOpacity>

                  {[10000, 20000, 50000, 100000, 200000, 500000].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => handleQuickAmount(amt)}
                    >
                      <Text style={[styles.quickChipText, { color: theme.text }]}>
                        {formatCurrency(amt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Numeric Numpad Grid */}
                <View style={styles.numpadGrid}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map((key) => (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      style={[styles.numpadKey, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => handleNumpadKey(key)}
                    >
                      <Text style={[styles.numpadKeyText, { color: theme.text }]}>{key}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* TAB CONTENT: NON-CASH (QRIS / TRANSFER / E-WALLET / OTHER) */}
            {activeTab !== 'cash' && (
              <ScrollView style={styles.nonCashContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.subMethodHeader, { color: theme.textSecondary }]}>
                  Select {paymentTypes.find((t) => t.key === activeTab)?.label} Provider / Bank:
                </Text>

                {paymentMethods.filter((m) => m.type_key === activeTab).length === 0 ? (
                  <View style={styles.emptyMethodBox}>
                    <Text style={[styles.emptyMethodText, { color: theme.textSecondary }]}>
                      No active providers configured for this type.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.providerGrid}>
                    {paymentMethods
                      .filter((m) => m.type_key === activeTab)
                      .map((method) => {
                        const isSelected = selectedMethodName === method.method_name;

                        return (
                          <TouchableOpacity
                            key={method.id}
                            activeOpacity={0.7}
                            style={[
                              styles.providerCard,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              isSelected && {
                                borderColor: theme.primary,
                                backgroundColor: theme.primary + '10',
                              },
                            ]}
                            onPress={() => setSelectedMethodName(method.method_name)}
                          >
                            <View style={styles.providerCardHeader}>
                              {activeTab === 'qris' ? (
                                <QrCode size={24} color={isSelected ? theme.primary : theme.textSecondary} />
                              ) : (
                                <CreditCard size={24} color={isSelected ? theme.primary : theme.textSecondary} />
                              )}
                              {isSelected && <CheckCircle2 size={18} color={theme.primary} />}
                            </View>
                            <Text
                              style={[
                                styles.providerName,
                                { color: isSelected ? theme.primary : theme.text },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              {method.method_name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}

                {selectedMethodName ? (
                  <View style={[styles.methodInstructionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.instructionTitle, { color: theme.text }]}>
                      Selected: {selectedMethodName}
                    </Text>
                    <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                      Please collect payment of {formatCurrency(finalTotal)} via {selectedMethodName} before confirming.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            {/* BOTTOM CONFIRM BUTTON */}
            <View style={[styles.bottomActionRow, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor:
                      activeTab === 'cash' && !isCashSufficient
                        ? '#94A3B8'
                        : theme.primary,
                  },
                ]}
                onPress={handleConfirmPayment}
                disabled={processing || (activeTab === 'cash' && !isCashSufficient)}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle2 size={20} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>
                      {activeTab === 'cash'
                        ? `Pay ${formatCurrency(finalTotal)}`
                        : `Confirm ${selectedMethodName} (${formatCurrency(finalTotal)})`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* DISCOUNT PICKER MODAL */}
      <Modal
        visible={showDiscountPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscountPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Discount Preset</Text>
              <TouchableOpacity onPress={() => setShowDiscountPicker(false)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.discountsList} showsVerticalScrollIndicator={false}>
              {/* No Discount Option */}
              <TouchableOpacity
                style={[
                  styles.discountOptionCard,
                  { borderColor: theme.border },
                  selectedDiscount === null && { borderColor: theme.primary, backgroundColor: theme.primary + '10' },
                ]}
                onPress={() => {
                  setSelectedDiscount(null);
                  setShowDiscountPicker(false);
                }}
              >
                <Text style={[styles.discountOptionName, { color: theme.text }]}>None (No Discount)</Text>
              </TouchableOpacity>

              {discounts.map((d) => {
                const isSelected = selectedDiscount?.id === d.id;
                const isEligible = !d.min_order_amount || subtotal >= d.min_order_amount;

                return (
                  <TouchableOpacity
                    key={d.id}
                    disabled={!isEligible}
                    style={[
                      styles.discountOptionCard,
                      { borderColor: theme.border },
                      isSelected && { borderColor: theme.primary, backgroundColor: theme.primary + '10' },
                      !isEligible && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      setSelectedDiscount(d);
                      setShowDiscountPicker(false);
                    }}
                  >
                    <View style={styles.discountOptionMain}>
                      <Text style={[styles.discountOptionName, { color: theme.text }]}>{d.name}</Text>
                      <Text style={[styles.discountOptionValue, { color: theme.primary }]}>
                        {d.type === 'percentage' ? `${d.value}% OFF` : `${formatCurrency(d.value)} OFF`}
                      </Text>
                    </View>
                    {d.min_order_amount > 0 && (
                      <Text style={[styles.discountOptionSub, { color: theme.textSecondary }]}>
                        Min Order: {formatCurrency(d.min_order_amount)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PAYMENT SUCCESS RECEIPT MODAL */}
      <Modal visible={successOrder !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.receiptIconBox, { backgroundColor: theme.primary + '15' }]}>
              <CheckCircle2 size={44} color={theme.primary} />
            </View>

            <Text style={[styles.receiptTitle, { color: theme.text }]}>Payment Successful!</Text>
            <Text style={[styles.receiptSubtitle, { color: theme.textSecondary }]}>
              Order #{successOrder?.order_number}
            </Text>

            <View style={[styles.receiptSummary, { backgroundColor: theme.input + '40' }]}>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Total Paid:</Text>
                <Text style={[styles.receiptVal, { color: theme.text }]}>
                  {formatCurrency(successOrder?.amount_paid || 0)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Payment Method:</Text>
                <Text style={[styles.receiptVal, { color: theme.text }]}>
                  {successOrder?.payment_method?.toUpperCase()}
                </Text>
              </View>
              {successOrder?.payment_type === 'cash' && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Kembalian (Change):</Text>
                  <Text style={[styles.receiptVal, { color: theme.success || '#16A34A', fontWeight: '800' }]}>
                    {formatCurrency(successOrder?.change_amount || 0)}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.finishBtn, { backgroundColor: theme.primary }]}
              onPress={handleFinishNewSale}
            >
              <ShoppingCart size={18} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>Start New Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  mainLayout: {
    flex: 1,
  },
  tabletRow: {
    flexDirection: 'row',
  },
  mobileCol: {
    flexDirection: 'column',
  },

  // Summary section
  summarySection: {
    borderRightWidth: 1,
    padding: 16,
  },
  summaryTablet: {
    width: '40%',
  },
  summaryMobile: {
    maxHeight: 250,
    borderRightWidth: 0,
    borderBottomWidth: 1,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemsMiniList: {
    maxHeight: 120,
  },
  emptyCartNote: {
    fontSize: 13,
    paddingVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemNameText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  itemPriceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  calcLabel: {
    fontSize: 13,
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  discountSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
  },
  discountSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountSelectorTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  discountAmountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },

  // Payment section
  paymentSection: {
    flex: 1,
  },
  tabsScroll: {
    maxHeight: 56,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  paymentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
  },

  // Cash tab
  cashContent: {
    flex: 1,
    padding: 16,
  },
  amountDisplayCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  amountLabel: {
    fontSize: 14,
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 13,
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  numpadKey: {
    width: '31%',
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Non cash tab
  nonCashContent: {
    flex: 1,
    padding: 16,
  },
  subMethodHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyMethodBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyMethodText: {
    fontSize: 14,
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  providerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  methodInstructionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Bottom action
  bottomActionRow: {
    padding: 16,
    borderTopWidth: 1,
  },
  confirmButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal overlay & sheets
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerSheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  discountsList: {
    maxHeight: 320,
  },
  discountOptionCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  discountOptionMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountOptionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  discountOptionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  discountOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // Receipt card
  receiptCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  receiptIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  receiptSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  receiptSummary: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 13,
  },
  receiptVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  finishBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
