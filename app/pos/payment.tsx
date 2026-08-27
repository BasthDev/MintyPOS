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
import { ColorTheme, useTheme, withOpacity } from '@/constants/colorTheme';
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

// ─── Helper sub-components ────────────────────────────────────────────────────

function SummaryCell({
  label,
  value,
  accent,
  green,
  red,
  theme,
  styles,
}: {
  label: string;
  value: string;
  accent?: boolean;
  green?: boolean;
  red?: boolean;
  theme: ColorTheme;
  styles: any;
}) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryCellLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.summaryCellValue,
          { color: theme.text },
          accent && { color: theme.primary, fontWeight: '800' },
          green && { color: theme.success, fontWeight: '800' },
          red && { color: theme.error, fontWeight: '800' },
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
  quickAmounts,
  theme,
  styles,
}: {
  numpadStr: string;
  onKey: (k: string) => void;
  onQuick: (a: number) => void;
  quickAmounts: number[];
  theme: ColorTheme;
  styles: any;
}) {
  const display = numpadStr || '0';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={[styles.numpadDisplay, { color: theme.text }]}>
        {fmt(parseFloat(display || '0'))}
      </Text>
      <View style={styles.numpadGrid}>
        {keys.map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.numpadKey, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onKey(k)}
            activeOpacity={0.7}
          >
            <Text style={[styles.numpadKeyText, { color: theme.text }]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.quickAmounts}>
        {quickAmounts.map((amt) => (
          <TouchableOpacity
            key={amt}
            style={[
              styles.quickChip,
              {
                backgroundColor: withOpacity(theme.primary, 0.1),
                borderColor: theme.primary,
              },
            ]}
            onPress={() => onQuick(amt)}
            activeOpacity={0.75}
          >
            <Text style={[styles.quickChipText, { color: theme.primary }]}>{fmt(amt)}</Text>
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
  theme,
  styles,
  methodName,
}: {
  banks: string[];
  selected: string | null;
  onSelect: (b: string) => void;
  theme: ColorTheme;
  styles: any;
  methodName: string;
}) {
  if (banks.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Ionicons name="card-outline" size={36} color={theme.textTertiary} />
        <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginTop: 10 }}>
          No {methodName} providers configured
        </Text>
        <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 4, textAlign: 'center' }}>
          Configure methods in Settings → Payment Methods
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.bankGrid}>
        {banks.map((b) => {
          const isSelected = selected === b;
          return (
            <TouchableOpacity
              key={b}
              style={[
                styles.bankTile,
                {
                  backgroundColor: isSelected ? withOpacity(theme.primary, 0.15) : theme.card,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => onSelect(b)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.bankTileText,
                  { color: isSelected ? theme.primary : theme.text },
                  isSelected && { fontWeight: '800' },
                ]}
              >
                {b}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.primary}
                  style={{ marginTop: 4 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
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
  theme,
}: {
  visible: boolean;
  discounts: DiscountItem[];
  loading: boolean;
  selectedDiscount: DiscountItem | null;
  subtotal: number;
  onDiscountSelect: (discount: DiscountItem | null) => void;
  onClose: () => void;
  theme: ColorTheme;
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
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <View
            style={[
              dm.sheet,
              { backgroundColor: theme.card, borderColor: theme.border, borderTopWidth: 1 },
            ]}
          >
            <Pressable
              style={[dm.sheetHeader, { borderBottomColor: theme.divider }]}
              onPress={Keyboard.dismiss}
            >
              <View style={dm.sheetTitleRow}>
                <Ionicons name="pricetag-outline" size={18} color={theme.primary} />
                <Text style={[dm.sheetTitle, { color: theme.text }]}>Select Discount</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={dm.closeBtn}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </Pressable>

            {/* No discount option */}
            <TouchableOpacity
              style={[
                dm.discountRow,
                !selectedDiscount && { backgroundColor: withOpacity(theme.primary, 0.1) },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                onDiscountSelect(null);
              }}
              activeOpacity={0.75}
            >
              <View style={[dm.discountIcon, { backgroundColor: theme.input }]}>
                <Ionicons name="close-circle-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[dm.discountName, { color: theme.text }]}>No Discount</Text>
                <Text style={[dm.discountSub, { color: theme.textSecondary }]}>Full price, no deduction</Text>
              </View>
              {!selectedDiscount && (
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>

            <View style={[dm.divider, { backgroundColor: theme.divider }]} />

            {loading ? (
              <View style={dm.centered}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : discounts.length === 0 ? (
              <View style={dm.centered}>
                <Text style={[dm.emptyText, { color: theme.textSecondary }]}>
                  No active discounts available.
                </Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={{ maxHeight: 320 }}
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
                        isActive && { backgroundColor: withOpacity(theme.primary, 0.12) },
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
                          {
                            backgroundColor: isPercent
                              ? withOpacity(theme.primary, 0.15)
                              : withOpacity(theme.secondary, 0.15),
                          },
                        ]}
                      >
                        <Ionicons
                          name={isPercent ? 'pricetag-outline' : 'cash-outline'}
                          size={18}
                          color={isPercent ? theme.primary : theme.secondary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            dm.discountName,
                            { color: theme.text },
                            !eligible && { color: theme.textDisabled },
                          ]}
                        >
                          {d.name}
                        </Text>
                        <Text style={[dm.discountSub, { color: theme.textSecondary }]}>
                          {isPercent ? `${d.value}% OFF` : `${fmt(d.value)} OFF`}
                          {d.min_order_amount && d.min_order_amount > 0
                            ? ` • Min ${fmt(d.min_order_amount)}`
                            : ''}
                          {!eligible ? ' (not eligible)' : ''}
                        </Text>
                      </View>
                      {eligible && discAmt > 0 && (
                        <Text style={[dm.discountSaving, { color: theme.error }]}>-{fmt(discAmt)}</Text>
                      )}
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.primary}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={[dm.sheetFooter, { borderTopColor: theme.divider }]}>
              <TouchableOpacity
                style={[dm.doneBtn, { backgroundColor: theme.primary }]}
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

  const { cart, currency } = useStore();
  const styles = useMemo(() => createPaymentStyles(theme), [theme]);

  // Settings & DB configs
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfigItem[]>([]);
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Payment state
  const [method, setMethod] = useState<string>('cash');
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

  // 5. Available Payment Method Categories (derived dynamically from database)
  const availableMethodTypes = useMemo(() => {
    const types: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
      { key: 'cash', label: 'Cash', icon: 'cash-outline' },
    ];

    const knownKeys = new Set(['cash']);
    paymentMethods.forEach((m) => {
      if (m.is_active && !knownKeys.has(m.type_key)) {
        knownKeys.add(m.type_key);
        let icon: keyof typeof Ionicons.glyphMap = 'card-outline';
        if (m.type_key === 'card') icon = 'card-outline';
        else if (m.type_key === 'qris') icon = 'qr-code-outline';
        else if (m.type_key === 'transfer') icon = 'business-outline';
        else if (m.type_key === 'ewallet') icon = 'wallet-outline';

        types.push({
          key: m.type_key,
          label: m.type_label || (m.type_key === 'card' ? 'Card' : m.type_key.toUpperCase()),
          icon,
        });
      }
    });

    // Ensure standard options (card, qris, transfer) exist if user hasn't added customized keys
    if (!knownKeys.has('card')) types.push({ key: 'card', label: 'Card', icon: 'card-outline' });
    if (!knownKeys.has('qris')) types.push({ key: 'qris', label: 'QRIS', icon: 'qr-code-outline' });
    if (!knownKeys.has('transfer')) types.push({ key: 'transfer', label: 'Transfer', icon: 'business-outline' });

    return types;
  }, [paymentMethods]);

  // Providers list for current non-cash method
  const activeProvidersForMethod = useMemo(() => {
    if (method === 'cash') return [];
    const matching = paymentMethods.filter((m) => m.type_key === method && m.is_active);
    if (matching.length > 0) {
      return matching.map((m) => m.method_name);
    }
    // Fallback defaults
    if (method === 'card') return ['Debit Card', 'Credit Card', 'Visa', 'Mastercard', 'EDC'];
    if (method === 'qris') return ['QRIS', 'GoPay', 'DANA', 'OVO', 'ShopeePay'];
    if (method === 'transfer') return ['BCA', 'Mandiri', 'BRI', 'BNI', 'Bank Transfer'];
    if (method === 'ewallet') return ['Apple Pay', 'Google Pay', 'PayPal', 'Digital Wallet'];
    return [method.toUpperCase()];
  }, [method, paymentMethods]);

  // Smart Quick Amounts based on total and currency
  const quickAmounts = useMemo(() => {
    const list = new Set<number>();
    if (total > 0) list.add(total);

    if (currency?.code === 'IDR' || currency?.decimals === 0) {
      const base = [10000, 20000, 50000, 100000, 200000, 500000];
      if (total > 0) {
        const round10k = Math.ceil(total / 10000) * 10000;
        const round50k = Math.ceil(total / 50000) * 50000;
        const round100k = Math.ceil(total / 100000) * 100000;
        if (round10k > total) list.add(round10k);
        if (round50k > total) list.add(round50k);
        if (round100k > total) list.add(round100k);
      }
      base.forEach((b) => {
        if (b >= total) list.add(b);
      });
    } else {
      const base = [5, 10, 20, 50, 100, 200];
      if (total > 0) {
        const round1 = Math.ceil(total);
        const round5 = Math.ceil(total / 5) * 5;
        const round10 = Math.ceil(total / 10) * 10;
        const round20 = Math.ceil(total / 20) * 20;
        if (round1 > total) list.add(round1);
        if (round5 > total) list.add(round5);
        if (round10 > total) list.add(round10);
        if (round20 > total) list.add(round20);
      }
      base.forEach((b) => {
        if (b >= total) list.add(b);
      });
    }
    return Array.from(list).sort((a, b) => a - b).slice(0, 8);
  }, [total, currency]);

  const isNonCash = method !== 'cash';
  const canConfirm =
    subtotal > 0 &&
    (method === 'cash' ? paymentAmount >= total : selectedBank !== null);

  const shortfall = total - paymentAmount;

  const handleNumpad = (key: string) => {
    if (key === '⌫') setNumpadStr((prev) => prev.slice(0, -1));
    else if (key === '000') setNumpadStr((prev) => (prev + '000').replace(/^0+(\d)/, '$1'));
    else setNumpadStr((prev) => (prev + key).replace(/^0+(\d)/, '$1'));
  };

  const handleQuickAmount = (amt: number) => setNumpadStr(String(amt));

  const handleConfirm = async () => {
    if (!canConfirm) {
      Alert.alert(
        'Cannot Confirm',
        method === 'cash' && shortfall > 0
          ? `Insufficient payment. Need ${fmt(shortfall)} more.`
          : 'Please select a payment provider or check details.'
      );
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
        selectedBank: isNonCash ? selectedBank : null,
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

      // Clear temporary cart
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
    <View style={[styles.discountHeaderBadge, { backgroundColor: theme.primary }]}>
      <Tag size={16} color="#FFFFFF" />
    </View>
  ) : (
    <Tag size={20} color={theme.text} />
  );

  const hasExtraBreakdown = Boolean(
    selectedDiscount || (taxConfigs.length > 0 && (taxAmount > 0 || serviceAmount > 0))
  );

  const mobileSummary = hasExtraBreakdown ? (
    <View style={[styles.summaryGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <SummaryCell label="Subtotal" value={fmt(subtotal)} theme={theme} styles={styles} />
      {discountAmount > 0 ? (
        <SummaryCell label="Discount" value={`-${fmt(discountAmount)}`} red theme={theme} styles={styles} />
      ) : null}
      {serviceAmount > 0 ? (
        <SummaryCell label={`Service (${serviceRate}%)`} value={fmt(serviceAmount)} theme={theme} styles={styles} />
      ) : null}
      {taxAmount > 0 ? (
        <SummaryCell label={`Tax (${taxRate}%)`} value={fmt(taxAmount)} theme={theme} styles={styles} />
      ) : null}
      <SummaryCell label="Total" value={fmt(total)} accent theme={theme} styles={styles} />
      <SummaryCell label="Paid" value={fmt(paymentAmount)} theme={theme} styles={styles} />
      <SummaryCell label="Change" value={fmt(change)} green={change > 0} theme={theme} styles={styles} />
    </View>
  ) : (
    <View style={[styles.summaryRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <SummaryCell label="Total" value={fmt(total)} theme={theme} styles={styles} />
      <SummaryCell label="Paid" value={fmt(paymentAmount)} accent theme={theme} styles={styles} />
      <SummaryCell label="Change" value={fmt(change)} green={change > 0} theme={theme} styles={styles} />
    </View>
  );

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.background }]}>
      {/* Header with back button + discount icon */}
      <Header
        title="Payment Checkout"
        leftIcon={<ArrowLeft size={22} color={theme.text} />}
        onLeftPress={() => router.back()}
        rightIcon={discountRightIcon}
        onRightPress={() => setDiscountPickerVisible(true)}
      />

      {loadingConfigs ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading payment options...
          </Text>
        </View>
      ) : (
        <View style={[styles.mainLayout, { flexDirection: isWide ? 'row' : 'column' }]}>
          {/* LEFT PANEL */}
          <View style={{ flex: isWide ? 2 : 1 }}>
            {mobileSummary}

            <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
              {/* Payment methods navigation (includes Cash, Card, QRIS, Transfer, Digital Wallet, etc.) */}
              <View
                style={[
                  styles.methodsCol,
                  {
                    width: isWide ? 120 : undefined,
                    flexDirection: isWide ? 'column' : 'row',
                    borderRightWidth: isWide ? 1 : 0,
                    borderBottomWidth: isWide ? 0 : 1,
                    borderColor: theme.divider,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <ScrollView
                  horizontal={!isWide}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={
                    isWide
                      ? { gap: 8, padding: 8 }
                      : { gap: 8, paddingHorizontal: 12, paddingVertical: 8 }
                  }
                >
                  {availableMethodTypes.map((m) => {
                    const isActive = method === m.key;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.methodCard,
                          {
                            minWidth: isWide ? undefined : 84,
                            backgroundColor: isActive ? withOpacity(theme.primary, 0.15) : theme.input,
                            borderColor: isActive ? theme.primary : theme.inputBorder,
                          },
                        ]}
                        onPress={() => {
                          setMethod(m.key);
                          setNumpadStr('');
                          setSelectedBank(null);
                        }}
                      >
                        <Ionicons
                          name={m.icon}
                          size={22}
                          color={isActive ? theme.primary : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.methodLabel,
                            { color: isActive ? theme.primary : theme.textSecondary },
                            isActive && { fontWeight: '700' },
                          ]}
                        >
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Contextual input column */}
              <View style={[styles.contextCol, { backgroundColor: theme.background }]}>
                {method === 'cash' ? (
                  <CashInput
                    numpadStr={numpadStr}
                    onKey={handleNumpad}
                    onQuick={handleQuickAmount}
                    quickAmounts={quickAmounts}
                    theme={theme}
                    styles={styles}
                  />
                ) : (
                  <BankGrid
                    banks={activeProvidersForMethod}
                    selected={selectedBank}
                    onSelect={(b) => setSelectedBank(b)}
                    theme={theme}
                    styles={styles}
                    methodName={availableMethodTypes.find((m) => m.key === method)?.label || 'Payment'}
                  />
                )}
              </View>
            </View>

            {/* Bottom Bar for Mobile only */}
            {!isWide && (
              <View
                style={[
                  styles.mobileBottomBar,
                  {
                    borderTopColor: theme.divider,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                {!canConfirm && total > 0 && method === 'cash' && (
                  <Text style={[styles.shortfallText, { color: theme.error }]}>
                    Insufficient amount: -{fmt(shortfall)}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[
                      styles.seeCartBtn,
                      {
                        borderColor: theme.primary,
                        backgroundColor: withOpacity(theme.primary, 0.08),
                      },
                    ]}
                    onPress={() => setCartModalVisible(true)}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>
                      See Cart ({cart.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtnMain,
                      { backgroundColor: theme.primary },
                      (!canConfirm || confirming) && {
                        backgroundColor: theme.inputBorder,
                      },
                    ]}
                    onPress={handleConfirm}
                    disabled={!canConfirm || confirming}
                  >
                    <Text
                      style={[
                        styles.confirmBtnText,
                        (!canConfirm || confirming) && { color: theme.textDisabled },
                      ]}
                    >
                      {confirming ? 'Processing...' : 'Confirm Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* RIGHT 30% PANEL (Wide only) */}
          {isWide && (
            <View
              style={[
                styles.rightPanel,
                {
                  backgroundColor: theme.card,
                  borderLeftColor: theme.divider,
                },
              ]}
            >
              <FlatList
                data={cart}
                keyExtractor={(i) => i.productId.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.cartItem, { backgroundColor: theme.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cartItemName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: theme.textSecondary }]}>
                        {fmt(item.price)}
                      </Text>
                      {item.note && (
                        <Text style={[styles.cartItemNote, { color: theme.warning }]}>
                          Note: {item.note}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.cartItemSubtotal, { color: theme.primary }]}>
                      {fmt(item.price * item.quantity)}
                    </Text>
                    <View style={[styles.qtyBadgeStatic, { backgroundColor: theme.input }]}>
                      <Text style={[styles.qtyTextStatic, { color: theme.text }]}>
                        {item.quantity}x
                      </Text>
                    </View>
                  </View>
                )}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: theme.divider }} />
                )}
              />

              {discountAmount > 0 && (
                <View
                  style={[
                    styles.wideDiscountRow,
                    {
                      backgroundColor: withOpacity(theme.primary, 0.1),
                      borderColor: withOpacity(theme.primary, 0.3),
                    },
                  ]}
                >
                  <View style={styles.wideDiscountLeft}>
                    <Ionicons name="pricetag-outline" size={14} color={theme.primary} />
                    <Text style={[styles.wideDiscountName, { color: theme.primary }]}>
                      {selectedDiscount?.name || 'Discount'}
                    </Text>
                  </View>
                  <Text style={[styles.wideDiscountAmt, { color: theme.error }]}>
                    -{fmt(discountAmount)}
                  </Text>
                </View>
              )}

              {hasExtraBreakdown && (
                <View style={styles.rightSummaryLine}>
                  <Text style={[styles.rightSummaryLabel, { color: theme.textSecondary }]}>
                    Subtotal
                  </Text>
                  <Text style={[styles.rightSummaryValue, { color: theme.text }]}>
                    {fmt(subtotal)}
                  </Text>
                </View>
              )}

              {serviceAmount > 0 ? (
                <View style={styles.rightSummaryLine}>
                  <Text style={[styles.rightSummaryLabel, { color: theme.textSecondary }]}>
                    Service ({serviceRate}%)
                  </Text>
                  <Text style={[styles.rightSummaryValue, { color: theme.text }]}>
                    {fmt(serviceAmount)}
                  </Text>
                </View>
              ) : null}

              {taxAmount > 0 ? (
                <View style={styles.rightSummaryLine}>
                  <Text style={[styles.rightSummaryLabel, { color: theme.textSecondary }]}>
                    Tax ({taxRate}%)
                  </Text>
                  <Text style={[styles.rightSummaryValue, { color: theme.text }]}>
                    {fmt(taxAmount)}
                  </Text>
                </View>
              ) : null}

              {!canConfirm && total > 0 && method === 'cash' && (
                <Text style={[styles.shortfallText, { color: theme.error }]}>
                  Insufficient amount: -{fmt(shortfall)}
                </Text>
              )}

              <View style={[styles.rightTotal, { borderTopColor: theme.divider, borderTopWidth: 1 }]}>
                <Text style={[styles.rightTotalLabel, { color: theme.text }]}>Total</Text>
                <Text style={[styles.rightTotalValue, { color: theme.primary }]}>
                  {fmt(total)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: theme.primary },
                  (!canConfirm || confirming) && {
                    backgroundColor: theme.inputBorder,
                  },
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm || confirming}
              >
                <Text
                  style={[
                    styles.confirmBtnText,
                    (!canConfirm || confirming) && { color: theme.textDisabled },
                  ]}
                >
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay, justifyContent: 'flex-end' }]}>
          <View
            style={[
              styles.cartModalCard,
              {
                backgroundColor: theme.card,
                borderTopColor: theme.border,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
                Order Items ({cart.length})
              </Text>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              {cart.map((item) => (
                <View
                  key={item.productId}
                  style={[
                    styles.cartItem,
                    {
                      backgroundColor: theme.card,
                      borderBottomColor: theme.divider,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cartItemName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.cartItemPrice, { color: theme.textSecondary }]}>
                      {fmt(item.price)} each
                    </Text>
                    {item.note && (
                      <Text style={[styles.cartItemNote, { color: theme.warning }]}>
                        Note: {item.note}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.cartItemSubtotal, { color: theme.primary }]}>
                    {fmt(item.price * item.quantity)}
                  </Text>
                  <View style={[styles.qtyBadgeStatic, { backgroundColor: theme.input }]}>
                    <Text style={[styles.qtyTextStatic, { color: theme.text }]}>{item.quantity}x</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.divider }]}>
              <View style={styles.modalTotalRow}>
                <Text style={[styles.modalTotalLabel, { color: theme.text }]}>Total:</Text>
                <Text style={[styles.modalTotalVal, { color: theme.primary }]}>{fmt(total)}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.confirmBtnMain,
                  { backgroundColor: theme.primary },
                  (!canConfirm || confirming) && { backgroundColor: theme.inputBorder },
                ]}
                onPress={() => {
                  setCartModalVisible(false);
                  handleConfirm();
                }}
                disabled={!canConfirm || confirming}
              >
                <Text
                  style={[
                    styles.confirmBtnText,
                    (!canConfirm || confirming) && { color: theme.textDisabled },
                  ]}
                >
                  {confirming ? 'Processing...' : 'Confirm Payment'}
                </Text>
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
        theme={theme}
      />

      {/* Receipt Success Dialog */}
      <Modal visible={completedReceipt !== null} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.receiptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.receiptIconBox}>
              <Ionicons name="checkmark-circle" size={54} color={theme.success} />
            </View>

            <Text style={[styles.receiptTitle, { color: theme.text }]}>Payment Successful!</Text>
            <Text style={[styles.receiptSubtitle, { color: theme.textSecondary }]}>
              Order #{completedReceipt?.order_number}
            </Text>

            <View style={[styles.receiptSummary, { backgroundColor: theme.input }]}>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Total Paid:</Text>
                <Text style={[styles.receiptVal, { color: theme.text }]}>
                  {fmt(completedReceipt?.amount_paid || 0)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Payment Method:</Text>
                <Text style={[styles.receiptVal, { color: theme.text }]}>
                  {completedReceipt?.payment_method}
                </Text>
              </View>
              {completedReceipt?.payment_type === 'cash' && (
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: theme.textSecondary }]}>Change:</Text>
                  <Text style={[styles.receiptVal, { color: theme.success, fontWeight: '800' }]}>
                    {fmt(completedReceipt?.change_amount || 0)}
                  </Text>
                </View>
              )}
            </View>

            {/* Order Items in Receipt */}
            <View style={[styles.receiptItems, { backgroundColor: theme.input }]}>
              <Text style={[styles.receiptItemsTitle, { color: theme.text }]}>Order Items</Text>
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                {completedReceipt?.items?.map((item, idx) => (
                  <View key={idx} style={styles.receiptItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.receiptItemName, { color: theme.text }]}>{item.product_name}</Text>
                      <Text style={[styles.receiptItemQty, { color: theme.textSecondary }]}>
                        {item.quantity}x @ {fmt(item.price)}
                      </Text>
                      {item.note && (
                        <Text style={[styles.receiptItemNote, { color: theme.warning }]}>
                          Note: {item.note}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.receiptItemTotal, { color: theme.primary }]}>
                      {fmt(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.finishBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                setCompletedReceipt(null);
                router.replace('/');
              }}
            >
              <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>Start New Sale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Dynamic Theme-Driven Styles ──────────────────────────────────────────────

const createPaymentStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    screenContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 13,
    },
    mainLayout: {
      flex: 1,
    },
    discountHeaderBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderBottomWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      borderBottomWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 6,
      gap: 6,
    },
    summaryCell: {
      alignItems: 'center',
      minWidth: 70,
      paddingVertical: 2,
    },
    summaryCellLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    summaryCellValue: {
      fontSize: 14,
      fontWeight: '700',
      marginTop: 2,
    },
    methodsCol: {
      flexShrink: 0,
    },
    contextCol: {
      flex: 1.2,
      padding: 12,
    },
    methodCard: {
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderWidth: 1,
    },
    methodLabel: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    numpadDisplay: {
      fontSize: 26,
      fontWeight: '800',
      textAlign: 'right',
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    numpadGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numpadKey: {
      width: '30%',
      height: 54,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    numpadKeyText: {
      fontSize: 18,
      fontWeight: '700',
    },
    quickAmounts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    quickChip: {
      width: '48%',
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickChipText: {
      fontSize: 13,
      fontWeight: '700',
    },
    bankGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    bankTile: {
      width: '48%',
      padding: 16,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      justifyContent: 'center',
    },
    bankTileText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    mobileBottomBar: {
      gap: 10,
      padding: 12,
      borderTopWidth: 1,
    },
    seeCartBtn: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmBtnMain: {
      flex: 1.5,
      height: 48,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmBtn: {
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    confirmBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 15,
    },
    shortfallText: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
    },
    rightPanel: {
      flex: 1,
      borderLeftWidth: 1,
      padding: 12,
    },
    cartItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    cartItemName: {
      fontSize: 13,
      fontWeight: '700',
    },
    cartItemPrice: {
      fontSize: 12,
      marginTop: 2,
    },
    cartItemNote: {
      fontSize: 11,
      marginTop: 4,
      fontStyle: 'italic',
    },
    qtyBadgeStatic: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginHorizontal: 8,
    },
    qtyTextStatic: {
      fontWeight: '700',
      fontSize: 12,
    },
    cartItemSubtotal: {
      fontSize: 13,
      fontWeight: '700',
      minWidth: 80,
      textAlign: 'right',
    },
    wideDiscountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 8,
      borderWidth: 1,
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
    },
    wideDiscountAmt: {
      fontSize: 13,
      fontWeight: '700',
    },
    rightSummaryLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    rightSummaryLabel: {
      fontSize: 12,
    },
    rightSummaryValue: {
      fontSize: 12,
      fontWeight: '600',
    },
    rightTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
      marginVertical: 6,
    },
    rightTotalLabel: {
      fontWeight: '700',
      fontSize: 15,
    },
    rightTotalValue: {
      fontWeight: '800',
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    cartModalCard: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      maxHeight: '80%',
      padding: 16,
      width: '100%',
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalHeaderTitle: {
      fontSize: 18,
      fontWeight: '700',
    },
    modalFooter: {
      borderTopWidth: 1,
      paddingTop: 12,
      marginTop: 12,
    },
    modalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTotalLabel: {
      fontSize: 16,
      fontWeight: '700',
    },
    modalTotalVal: {
      fontSize: 18,
      fontWeight: '800',
    },
    receiptCard: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 20,
      borderWidth: 1,
      padding: 22,
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    receiptIconBox: {
      marginBottom: 10,
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
      marginBottom: 16,
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
    receiptItems: {
      width: '100%',
      borderRadius: 12,
      padding: 14,
      marginBottom: 18,
    },
    receiptItemsTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 10,
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
    },
    receiptItemQty: {
      fontSize: 12,
      marginTop: 2,
    },
    receiptItemNote: {
      fontSize: 11,
      marginTop: 2,
      fontStyle: 'italic',
    },
    receiptItemTotal: {
      fontSize: 13,
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

// ─── Discount Sheet Styles ────────────────────────────────────────────────────

const dm = StyleSheet.create({
  sheet: {
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
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
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
  },
  discountSub: {
    fontSize: 12,
    marginTop: 2,
  },
  discountSaving: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  doneBtn: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
