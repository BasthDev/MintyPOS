import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ArrowLeft, Tag } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';

import { Header } from '@/components/Header';
import { useTheme } from '@/constants/colorTheme';
import {
  CompletedOrder,
  dbOperations,
  DiscountItem,
  getDatabase,
  PaymentMethodItem,
  TaxConfigItem,
} from '@/lib/database';
import { formatCurrency as fmt } from '@/lib/utils';
import { CartProcess } from '@/processes/cartProcess';
import { CheckoutProcess } from '@/processes/checkoutProcess';
import { useStore } from '@/store/useStore';

type PaymentMethodType = 'cash' | 'qris' | 'transfer' | 'split';

// ─── Helper: compute discount amount from a Discount preset ─────────────────

function calcDiscountAmount(discount: DiscountItem | null, subtotal: number): number {
  if (!discount) return 0;
  if (discount.min_order_amount && subtotal < discount.min_order_amount) return 0;
  if (discount.type === 'percentage') {
    const raw = (subtotal * discount.value) / 100;
    if (discount.max_discount_amount && raw > discount.max_discount_amount)
      return discount.max_discount_amount;
    return raw;
  }
  return Math.min(discount.value, subtotal);
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SummaryCell({
  label,
  value,
  accent,
  green,
  red,
}: {
  label: string;
  value: string;
  accent?: boolean;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <View style={p.summaryCell}>
      <Text style={p.summaryCellLabel}>{label}</Text>
      <Text
        style={[
          p.summaryCellValue,
          accent && { color: '#065F46' },
          green && { color: '#065F46' },
          red && { color: '#EF4444' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function CashInput({
  numpadStr,
  onKey,
  onQuick,
}: {
  numpadStr: string;
  onKey: (k: string) => void;
  onQuick: (a: number) => void;
}) {
  const display = numpadStr || '0';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={p.numpadDisplay}>
        {fmt(parseInt(display || '0', 10))}
      </Text>
      <View style={p.numpadGrid}>
        {keys.map((k) => (
          <TouchableOpacity
            key={k}
            style={p.numpadKey}
            onPress={() => onKey(k)}
            activeOpacity={0.7}
          >
            <Text style={p.numpadKeyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={p.quickAmounts}>
        {[10000, 20000, 50000, 100000, 150000, 200000, 500000].map((amt) => (
          <TouchableOpacity
            key={amt}
            style={p.quickChip}
            onPress={() => onQuick(amt)}
            activeOpacity={0.75}
          >
            <Text style={p.quickChipText}>{fmt(amt)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function BankGrid({
  banks,
  selected,
  onSelect,
}: {
  banks: string[];
  selected: string | null;
  onSelect: (b: string) => void;
}) {
  if (banks.length === 0) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
          No payment methods configured
        </Text>
        <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>
          Add payment methods in Settings → Payment
        </Text>
      </View>
    );
  }

  return (
    <View style={p.bankGrid}>
      {banks.map((b) => (
        <TouchableOpacity
          key={b}
          style={[p.bankTile, selected === b && p.bankTileActive]}
          onPress={() => onSelect(b)}
          activeOpacity={0.75}
        >
          <Text
            style={[p.bankTileText, selected === b && p.bankTileTextActive]}
          >
            {b}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Discount Picker Modal ────────────────────────────────────────────────────

function DiscountPickerModal({
  visible,
  discounts,
  loading,
  selectedDiscount,
  subtotal,
  onDiscountSelect,
  onClose,
}: {
  visible: boolean;
  discounts: DiscountItem[];
  loading: boolean;
  selectedDiscount: DiscountItem | null;
  subtotal: number;
  onDiscountSelect: (discount: DiscountItem | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <View style={[StyleSheet.absoluteFill, dm.overlay]} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <View style={dm.sheet}>
            <Pressable style={dm.sheetHeader} onPress={Keyboard.dismiss}>
              <View style={dm.sheetTitleRow}>
                <Ionicons name="pricetag-outline" size={18} color="#065F46" />
                <Text style={dm.sheetTitle}>Select Discount</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={dm.closeBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </Pressable>

            {/* No discount option */}
            <TouchableOpacity
              style={[dm.discountRow, !selectedDiscount && dm.discountRowActive]}
              onPress={() => {
                Keyboard.dismiss();
                onDiscountSelect(null);
              }}
              activeOpacity={0.75}
            >
              <View style={[dm.discountIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dm.discountName}>No Discount</Text>
                <Text style={dm.discountSub}>Full price, no deduction</Text>
              </View>
              {!selectedDiscount && (
                <Ionicons name="checkmark-circle" size={20} color="#065F46" />
              )}
            </TouchableOpacity>

            <View style={dm.divider} />

            {loading ? (
              <View style={dm.centered}>
                <ActivityIndicator color="#065F46" />
              </View>
            ) : discounts.length === 0 ? (
              <View style={dm.centered}>
                <Text style={dm.emptyText}>No active discounts available.</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {discounts.map((d) => {
                  const isActive = selectedDiscount?.id === d.id;
                  const discAmt = calcDiscountAmount(d, subtotal);
                  const eligible =
                    !d.min_order_amount || subtotal >= d.min_order_amount;
                  const isPercent = d.type === 'percentage';
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        dm.discountRow,
                        isActive && dm.discountRowActive,
                        !eligible && dm.discountRowDisabled,
                      ]}
                      onPress={() => {
                        if (eligible) {
                          Keyboard.dismiss();
                          onDiscountSelect(d);
                        }
                      }}
                      activeOpacity={eligible ? 0.75 : 1}
                    >
                      <View
                        style={[
                          dm.discountIcon,
                          isPercent
                            ? { backgroundColor: '#ECFDF5' }
                            : { backgroundColor: '#EEF2FF' },
                        ]}
                      >
                        <Ionicons
                          name={isPercent ? 'pricetag-outline' : 'cash-outline'}
                          size={18}
                          color={isPercent ? '#065F46' : '#6366F1'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[dm.discountName, !eligible && { color: '#9CA3AF' }]}
                        >
                          {d.name}
                        </Text>
                        <Text style={dm.discountSub}>
                          {isPercent ? `${d.value}% OFF` : `${fmt(d.value)} OFF`}
                          {d.min_order_amount && d.min_order_amount > 0
                            ? ` • Min ${fmt(d.min_order_amount)}`
                            : ''}
                          {!eligible ? ' (not eligible)' : ''}
                        </Text>
                      </View>
                      {eligible && discAmt > 0 && (
                        <Text style={dm.discountSaving}>-{fmt(discAmt)}</Text>
                      )}
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#065F46"
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={dm.sheetFooter}>
              <TouchableOpacity
                style={dm.doneBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Text style={dm.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Main Payment Screen ──────────────────────────────────────────────────────

export default function POSPaymentScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const { cart } = useStore();

  // Settings & DB configs
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfigItem[]>([]);
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Payment state
  const [method, setMethod] = useState<PaymentMethodType>('cash');
  const [numpadStr, setNumpadStr] = useState('');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  // Discount state
  const [discountPickerVisible, setDiscountPickerVisible] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountItem | null>(null);

  // Cart modal state (mobile)
  const [cartModalVisible, setCartModalVisible] = useState(false);

  // Processing & Receipt state
  const [confirming, setConfirming] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<CompletedOrder | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingConfigs(true);
    try {
      const db = await getDatabase();
      const [methods, taxes, discList] = await Promise.all([
        dbOperations.getActivePaymentMethods(db),
        dbOperations.getActiveTaxConfigs(db),
        dbOperations.getActiveDiscounts(db),
      ]);
      setPaymentMethods(methods);
      setTaxConfigs(taxes);
      setDiscounts(discList);
    } catch (error) {
      console.error('Failed to load payment settings:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // 1. Calculate Subtotal
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // 2. Discount Amount
  const discountAmount = calcDiscountAmount(selectedDiscount, subtotal);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // 3. Tax & Service Charge
  const { taxAmount, serviceAmount, taxRate, serviceRate } = useMemo(() => {
    let tAmt = 0;
    let sAmt = 0;
    let tRate = 0;
    let sRate = 0;

    taxConfigs.forEach((t) => {
      let amt = 0;
      if (t.type === 'percentage') {
        amt = Math.round((afterDiscount * t.rate) / 100);
      } else {
        amt = Math.round(t.rate);
      }

      if (t.name.toLowerCase().includes('service')) {
        sAmt += amt;
        sRate = t.rate;
      } else {
        tAmt += amt;
        tRate = t.rate;
      }
    });

    return { taxAmount: tAmt, serviceAmount: sAmt, taxRate: tRate, serviceRate: sRate };
  }, [taxConfigs, afterDiscount]);

  // 4. Net Total
  const total = Math.max(0, afterDiscount + taxAmount + serviceAmount);
  const paymentAmount = method === 'cash' ? parseFloat(numpadStr) || 0 : total;
  const change = method === 'cash' ? Math.max(0, paymentAmount - total) : 0;
  const isBankMethod = method === 'qris' || method === 'transfer';

  const activeQrisBanks = useMemo(() => {
    return paymentMethods.filter((m) => m.type_key === 'qris').map((m) => m.method_name);
  }, [paymentMethods]);

  const activeTransferBanks = useMemo(() => {
    return paymentMethods.filter((m) => m.type_key === 'transfer').map((m) => m.method_name);
  }, [paymentMethods]);

  const canConfirm =
    paymentAmount >= total &&
    subtotal > 0 &&
    (!isBankMethod || selectedBank !== null);

  const shortfall = total - paymentAmount;

  const handleNumpad = (key: string) => {
    if (key === '⌫') setNumpadStr((prev) => prev.slice(0, -1));
    else if (key === '000') setNumpadStr((prev) => (prev + '000').replace(/^0+(\d)/, '$1'));
    else setNumpadStr((prev) => (prev + key).replace(/^0+(\d)/, '$1'));
  };

  const handleQuickAmount = (amt: number) => setNumpadStr(String(amt));

  const handleConfirm = async () => {
    if (!canConfirm) {
      Alert.alert('Cannot Confirm', shortfall > 0 ? `Insufficient payment. Need ${fmt(shortfall)} more.` : 'Please check your payment details.');
      return;
    }

    setConfirming(true);
    try {
      const result = await CheckoutProcess.processCheckout({
        cart,
        subtotal,
        total,
        paymentMethod: method,
        paymentAmount: method === 'cash' ? paymentAmount : total,
        selectedBank,
        selectedDiscount,
        discountAmount,
        taxAmount,
        serviceAmount,
        change,
      });

      if (!result.success || !result.order) {
        Alert.alert('Payment Error', (result.errors || ['Validation failed']).join('\n'));
        return;
      }

      // Clear Zustand temporary cart
      CartProcess.clearCart();
      setCompletedReceipt(result.order);
    } catch (error: any) {
      console.error('Payment failed:', error);
      Alert.alert('Payment Failed', error?.message || 'An unexpected error occurred during payment processing.');
    } finally {
      setConfirming(false);
    }
  };

  const handleSelectDiscount = (d: DiscountItem | null) => {
    if (d) {
      const validation = CheckoutProcess.validateDiscountSelection(d, subtotal);
      if (!validation.isValid) {
        Alert.alert('Discount Ineligible', validation.errors.join('\n'));
        return;
      }
    }
    setSelectedDiscount(d);
    setDiscountPickerVisible(false);
  };

  const discountRightIcon = selectedDiscount ? (
    <View style={p.discountHeaderBadge}>
      <Tag size={16} color="#fff" />
    </View>
  ) : (
    <Tag size={20} color={theme.text} />
  );

  const hasExtraBreakdown = Boolean(
    selectedDiscount || (taxConfigs.length > 0 && (taxAmount > 0 || serviceAmount > 0))
  );

  const mobileSummary = hasExtraBreakdown ? (
    <View style={p.summaryGrid}>
      <SummaryCell label="Subtotal" value={fmt(subtotal)} />
      {discountAmount > 0 ? (
        <SummaryCell label="Discount" value={`-${fmt(discountAmount)}`} red />
      ) : null}
      {serviceAmount > 0 ? (
        <SummaryCell label={`Service (${serviceRate}%)`} value={fmt(serviceAmount)} />
      ) : null}
      {taxAmount > 0 ? (
        <SummaryCell label={`Tax (${taxRate}%)`} value={fmt(taxAmount)} />
      ) : null}
      <SummaryCell label="Total" value={fmt(total)} accent />
      <SummaryCell label="Paid" value={fmt(paymentAmount)} />
      <SummaryCell label="Change" value={fmt(change)} green={change > 0} />
    </View>
  ) : (
    <View style={p.summaryRow}>
      <SummaryCell label="Total" value={fmt(total)} />
      <SummaryCell label="Paid" value={fmt(paymentAmount)} accent />
      <SummaryCell label="Change" value={fmt(change)} green={change > 0} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header with back button + discount icon */}
      <Header
        title="Payment Checkout"
        leftIcon={<ArrowLeft size={22} color={theme.text} />}
        onLeftPress={() => router.back()}
        rightIcon={discountRightIcon}
        onRightPress={() => setDiscountPickerVisible(true)}
      />

      {loadingConfigs ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#065F46" />
          <Text style={{ marginTop: 10, color: '#6B7280', fontSize: 13 }}>Loading payment options...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
          {/* LEFT PANEL */}
          <View style={{ flex: isWide ? 2 : 1 }}>
            {mobileSummary}

            <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
              {/* Payment methods column */}
              <View
                style={[
                  p.methodsCol,
                  {
                    width: isWide ? 110 : undefined,
                    flexDirection: isWide ? 'column' : 'row',
                    borderRightWidth: isWide ? 1 : 0,
                    borderBottomWidth: isWide ? 0 : 1,
                    borderBottomColor: '#E5E7EB',
                  },
                ]}
              >
                <ScrollView
                  horizontal={!isWide}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={
                    isWide
                      ? { gap: 8, marginBottom: 8 }
                      : { gap: 8, paddingHorizontal: 12, paddingVertical: 8 }
                  }
                >
                  {(['cash', 'qris', 'transfer'] as PaymentMethodType[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        p.methodCard,
                        { flex: isWide ? undefined : undefined, minWidth: isWide ? undefined : 80 },
                        method === m && p.methodCardActive,
                      ]}
                      onPress={() => {
                        setMethod(m);
                        setNumpadStr('');
                        setSelectedBank(null);
                      }}
                    >
                      <Ionicons
                        name={
                          m === 'cash'
                            ? 'cash-outline'
                            : m === 'qris'
                            ? 'qr-code-outline'
                            : 'card-outline'
                        }
                        size={22}
                        color={method === m ? '#065F46' : '#6B7280'}
                      />
                      <Text style={[p.methodLabel, method === m && p.methodLabelActive]}>
                        {m === 'cash' ? 'Cash' : m === 'qris' ? 'QRIS' : 'Transfer'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Contextual input column */}
              <View style={{ flex: 1.2, padding: 12 }}>
                {method === 'cash' && (
                  <CashInput
                    numpadStr={numpadStr}
                    onKey={handleNumpad}
                    onQuick={handleQuickAmount}
                  />
                )}
                {method === 'qris' && (
                  <BankGrid
                    banks={activeQrisBanks}
                    selected={selectedBank}
                    onSelect={(b) => setSelectedBank(b)}
                  />
                )}
                {method === 'transfer' && (
                  <BankGrid
                    banks={activeTransferBanks}
                    selected={selectedBank}
                    onSelect={(b) => setSelectedBank(b)}
                  />
                )}
              </View>
            </View>

            {/* Bottom Bar for Mobile only */}
            {!isWide && (
              <View
                style={{
                  gap: 12,
                  padding: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#E5E7EB',
                  backgroundColor: '#fff',
                }}
              >
                {!canConfirm && total > 0 && method === 'cash' && (
                  <Text style={p.shortfallText}>
                    Insufficient amount: -{fmt(shortfall)}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#065F46',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => setCartModalVisible(true)}
                  >
                    <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 15 }}>
                      See Cart ({cart.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      {
                        flex: 1.5,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: '#065F46',
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                      (!canConfirm || confirming) && p.confirmBtnDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={!canConfirm || confirming}
                  >
                    <Text style={p.confirmBtnText}>
                      {confirming ? 'Processing...' : 'Confirm Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* RIGHT 30% PANEL (Wide only) */}
          {isWide && (
            <View style={p.rightPanel}>
              <FlatList
                data={cart}
                keyExtractor={(i) => i.productId.toString()}
                renderItem={({ item }) => (
                  <View style={p.cartItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={p.cartItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={p.cartItemPrice}>{fmt(item.price)}</Text>
                      {item.note && (
                        <Text style={p.cartItemNote}>Note: {item.note}</Text>
                      )}
                    </View>
                    <Text style={p.cartItemSubtotal}>
                      {fmt(item.price * item.quantity)}
                    </Text>
                    <View style={p.qtyBadgeStatic}>
                      <Text style={p.qtyTextStatic}>{item.quantity}x</Text>
                    </View>
                  </View>
                )}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />
                )}
              />

              {discountAmount > 0 && (
                <View style={p.wideDiscountRow}>
                  <View style={p.wideDiscountLeft}>
                    <Ionicons name="pricetag-outline" size={14} color="#065F46" />
                    <Text style={p.wideDiscountName}>{selectedDiscount?.name || 'Discount'}</Text>
                  </View>
                  <Text style={p.wideDiscountAmt}>-{fmt(discountAmount)}</Text>
                </View>
              )}

              {hasExtraBreakdown && (
                <View style={p.rightSummaryLine}>
                  <Text style={p.rightSummaryLabel}>Subtotal</Text>
                  <Text style={p.rightSummaryValue}>{fmt(subtotal)}</Text>
                </View>
              )}

              {serviceAmount > 0 ? (
                <View style={p.rightSummaryLine}>
                  <Text style={p.rightSummaryLabel}>Service ({serviceRate}%)</Text>
                  <Text style={p.rightSummaryValue}>{fmt(serviceAmount)}</Text>
                </View>
              ) : null}

              {taxAmount > 0 ? (
                <View style={p.rightSummaryLine}>
                  <Text style={p.rightSummaryLabel}>Tax ({taxRate}%)</Text>
                  <Text style={p.rightSummaryValue}>{fmt(taxAmount)}</Text>
                </View>
              ) : null}

              {!canConfirm && total > 0 && method === 'cash' && (
                <Text style={p.shortfallText}>Insufficient amount: -{fmt(shortfall)}</Text>
              )}

              <View style={p.rightTotal}>
                <Text style={p.rightTotalLabel}>Total</Text>
                <Text style={p.rightTotalValue}>{fmt(total)}</Text>
              </View>

              <TouchableOpacity
                style={[
                  p.confirmBtn,
                  (!canConfirm || confirming) && p.confirmBtnDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm || confirming}
              >
                <Text style={p.confirmBtnText}>
                  {confirming ? 'Processing...' : 'Confirm Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Cart Modal (Mobile) */}
      <Modal
        visible={cartModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Order Items ({cart.length})</Text>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.productId} style={p.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={p.cartItemName}>{item.name}</Text>
                    <Text style={p.cartItemPrice}>{fmt(item.price)} each</Text>
                    {item.note && (
                      <Text style={p.cartItemNote}>Note: {item.note}</Text>
                    )}
                  </View>
                  <Text style={p.cartItemSubtotal}>{fmt(item.price * item.quantity)}</Text>
                  {/* <Text style={p.qtyTextStatic}>x{item.quantity}</Text> */}
                   <View style={p.qtyBadgeStatic}>
                      <Text style={p.qtyTextStatic}>{item.quantity}x</Text>
                    </View>
                </View>
              ))}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Total:</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#065F46' }}>{fmt(total)}</Text>
              </View>
              <TouchableOpacity
                style={[p.confirmBtn, (!canConfirm || confirming) && p.confirmBtnDisabled]}
                onPress={() => {
                  setCartModalVisible(false);
                  handleConfirm();
                }}
                disabled={!canConfirm || confirming}
              >
                <Text style={p.confirmBtnText}>{confirming ? 'Processing...' : 'Confirm Payment'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Discount Picker Modal */}
      <DiscountPickerModal
        visible={discountPickerVisible}
        discounts={discounts}
        loading={false}
        selectedDiscount={selectedDiscount}
        subtotal={subtotal}
        onDiscountSelect={handleSelectDiscount}
        onClose={() => setDiscountPickerVisible(false)}
      />

      {/* Receipt Success Dialog */}
      <Modal visible={completedReceipt !== null} transparent animationType="fade">
        <View style={p.modalOverlay}>
          <View style={p.receiptCard}>
            <View style={p.receiptIconBox}>
              <Ionicons name="checkmark-circle" size={54} color="#065F46" />
            </View>

            <Text style={p.receiptTitle}>Payment Successful!</Text>
            <Text style={p.receiptSubtitle}>Order #{completedReceipt?.order_number}</Text>

            <View style={p.receiptSummary}>
              <View style={p.receiptRow}>
                <Text style={p.receiptLabel}>Total Paid:</Text>
                <Text style={p.receiptVal}>{fmt(completedReceipt?.amount_paid || 0)}</Text>
              </View>
              <View style={p.receiptRow}>
                <Text style={p.receiptLabel}>Payment Method:</Text>
                <Text style={p.receiptVal}>{completedReceipt?.payment_method}</Text>
              </View>
              {completedReceipt?.payment_type === 'cash' && (
                <View style={p.receiptRow}>
                  <Text style={p.receiptLabel}>Kembalian (Change):</Text>
                  <Text style={[p.receiptVal, { color: '#065F46', fontWeight: '800' }]}>
                    {fmt(completedReceipt?.change_amount || 0)}
                  </Text>
                </View>
              )}
            </View>

            {/* Order Items in Receipt */}
            <View style={p.receiptItems}>
              <Text style={p.receiptItemsTitle}>Order Items</Text>
              {completedReceipt?.items?.map((item, idx) => (
                <View key={idx} style={p.receiptItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={p.receiptItemName}>{item.product_name}</Text>
                    <Text style={p.receiptItemQty}>{item.quantity}x @ {fmt(item.price)}</Text>
                    {item.note && (
                      <Text style={p.receiptItemNote}>Note: {item.note}</Text>
                    )}
                  </View>
                  <Text style={p.receiptItemTotal}>{fmt(item.subtotal)}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={p.finishBtn}
              onPress={() => {
                setCompletedReceipt(null);
                router.replace('/');
              }}
            >
              <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
              <Text style={p.finishBtnText}>Start New Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles matching POSProject ────────────────────────────────────────────────

const p = StyleSheet.create({
  discountHeaderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Summary row & grid
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 12,
  },
  summaryCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  summaryCellLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryCellValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // Payment methods column
  methodsCol: {
    width: 110,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  methodCard: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodCardActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#065F46',
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodLabelActive: {
    color: '#065F46',
  },

  // Confirm area
  confirmBtn: {
    backgroundColor: '#065F46',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  shortfallText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 13,
  },

  // Right panel
  rightPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    padding: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cartItemNote: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  qtyBadgeStatic: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 8,
  },
  qtyTextStatic: {
    fontWeight: '700',
    fontSize: 12,
    color: '#475569',
  },
  cartItemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    minWidth: 80,
    textAlign: 'right',
  },

  wideDiscountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  wideDiscountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  wideDiscountName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  wideDiscountAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  rightSummaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  rightSummaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  rightSummaryValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  rightTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginVertical: 4,
  },
  rightTotalLabel: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
  },
  rightTotalValue: {
    fontWeight: '700',
    fontSize: 14,
    color: '#065F46',
  },

  // Numpad
  numpadDisplay: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
    color: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKey: {
    width: '30%',
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  quickChip: {
    width: '48%',
    // height: 60,
    backgroundColor: '#F0FDF4',
    borderColor: '#065F46',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bankTile: {
    width: '48%',
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankTileActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#065F46',
  },
  bankTileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  bankTileTextActive: {
    color: '#065F46',
  },

  // Modal overlays & Receipt Card
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  receiptCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  receiptIconBox: {
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  receiptSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  receiptSummary: {
    width: '100%',
    backgroundColor: '#F8FAFC',
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
    color: '#6B7280',
  },
  receiptVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  receiptItems: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  receiptItemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  receiptItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  receiptItemQty: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptItemNote: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  receiptItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  finishBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#065F46',
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

// ─── Discount Sheet Styles matching POSProject ───────────────────────────────

const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  discountRowActive: {
    backgroundColor: '#F0FDF4',
  },
  discountRowDisabled: {
    opacity: 0.45,
  },
  discountIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  discountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  discountSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  discountSaving: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    minWidth: 70,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
  },
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  doneBtn: {
    backgroundColor: '#065F46',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
