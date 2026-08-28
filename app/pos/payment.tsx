import { router } from 'expo-router';
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  CheckCircle2,
  Coins,
  CreditCard,
  Divide,
  FileText,
  Minus,
  MoreVertical,
  Plus,
  QrCode,
  Search,
  Smartphone,
  Sparkles,
  Tag,
  User,
  Users,
  Wallet,
  X,
  XCircle
} from 'lucide-react-native';
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';

import { ActionSheetFormSheet } from '@/components/forms/ActionSheetFormSheet';
import { Header } from '@/components/Header';
import { ColorTheme, useTheme, withOpacity } from '@/constants/colorTheme';
import {
  CompletedOrder,
  CRMConfigItem,
  CustomerItem,
  dbOperations,
  DiscountItem,
  getDatabase,
  PaymentMethodItem,
  TaxConfigItem,
} from '@/lib/database';
import { formatCurrency as fmt } from '@/lib/utils';
import { CartProcess } from '@/processes/cartProcess';
import { CheckoutProcess } from '@/processes/checkoutProcess';
import { CRMProcess } from '@/processes/crmProcess';
import { CustomerProcess } from '@/processes/customerProcess';
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

// ─── Helper: convert number to ordinal (1st, 2nd, 3rd, etc.) ─────────────────

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
  theme,
  styles,
  itemCount,
}: {
  label: string;
  value: string;
  accent?: boolean;
  green?: boolean;
  red?: boolean;
  theme: ColorTheme;
  styles: any;
  itemCount: number;
}) {
  // Dynamic width layout based on your specifications:
  // 4 items -> 2x2 layout (~48% width)
  // 3 items -> 3 in a row (~31% width)
  // 5 items -> 3 and 2
  // 6 items -> 3 and 3
  // 7 items -> 3, 3, and 1
  let widthPercent = '31%';
  if (itemCount === 4 || itemCount === 2) {
    widthPercent = '48%';
  } else if (itemCount === 1) {
    widthPercent = '100%';
  }

  return (
    <View style={[styles.summaryCell, { width: widthPercent }]}>
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
        <CreditCard size={36} color={theme.textTertiary} />
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
                <View style={{position: 'absolute', top: 0, right: 5}}>
                <CheckCircle2
                  size={18}
                  color={theme.primary}
                  style={{ marginTop: 4 }}
                />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Customer Selection Modal ────────────────────────────────────────────────

function CustomerPickerModal({
  visible,
  customers,
  loading,
  selectedCustomer,
  onCustomerSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  customers: CustomerItem[];
  loading: boolean;
  selectedCustomer: CustomerItem | null;
  onCustomerSelect: (customer: CustomerItem | null) => void;
  onClose: () => void;
  theme: ColorTheme;
}) {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

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
            <Pressable style={[dm.sheetHeader, { borderBottomColor: theme.divider }]} onPress={Keyboard.dismiss}>
              <View style={dm.sheetTitleRow}>
                <User size={18} color={theme.primary} />
                <Text style={[dm.sheetTitle, { color: theme.text }]}>Select Customer (CRM)</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={dm.closeBtn}
              >
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </Pressable>

            {/* Search input */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.input,
                  paddingHorizontal: 12,
                }}
              >
                <Search size={16} color={theme.textSecondary} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, color: theme.text }}
                  placeholder="Search customer by name or phone..."
                  placeholderTextColor={theme.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            {/* Walk-in (No customer) */}
            <TouchableOpacity
              style={[
                dm.discountRow,
                !selectedCustomer && { backgroundColor: withOpacity(theme.primary, 0.1) },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                onCustomerSelect(null);
              }}
              activeOpacity={0.75}
            >
              <View style={[dm.discountIcon, { backgroundColor: theme.input }]}>
                <XCircle size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[dm.discountName, { color: theme.text }]}>Walk-in Customer</Text>
                <Text style={[dm.discountSub, { color: theme.textSecondary }]}>No customer attached</Text>
              </View>
              {!selectedCustomer && <CheckCircle2 size={20} color={theme.primary} />}
            </TouchableOpacity>

            <View style={[dm.divider, { backgroundColor: theme.divider }]} />

            {loading ? (
              <View style={dm.centered}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : filtered.length === 0 ? (
              <View style={dm.centered}>
                <Text style={[dm.emptyText, { color: theme.textSecondary }]}>No customers found.</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={{ maxHeight: 260 }}
              >
                {filtered.map((c) => {
                  const isActive = selectedCustomer?.id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        dm.discountRow,
                        isActive && { backgroundColor: withOpacity(theme.primary, 0.12) },
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        onCustomerSelect(c);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[dm.discountIcon, { backgroundColor: withOpacity(theme.primary, 0.15) }]}>
                        <User size={18} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[dm.discountName, { color: theme.text }]}>{c.name}</Text>
                        <Text style={[dm.discountSub, { color: theme.textSecondary }]}>
                          {c.phone || c.email || 'No contact'} • Pts: {c.loyalty_points || 0}
                        </Text>
                      </View>
                      {isActive && (
                        <CheckCircle2 size={20} color={theme.primary} style={{ marginLeft: 8 }} />
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

// ─── Discount Picker Modal (with Loyalty Point Redemption) ────────────────────

function DiscountPickerModal({
  visible,
  discounts,
  loading,
  selectedDiscount,
  subtotal,
  onDiscountSelect,
  onClose,
  theme,
  crmConfig,
  customer,
  pointsToRedeem,
  onPointsRedeemChange,
  pointRedemptionEnabled,
  onPointRedemptionToggle,
}: {
  visible: boolean;
  discounts: DiscountItem[];
  loading: boolean;
  selectedDiscount: DiscountItem | null;
  subtotal: number;
  onDiscountSelect: (discount: DiscountItem | null) => void;
  onClose: () => void;
  theme: ColorTheme;
  crmConfig: CRMConfigItem | null;
  customer: CustomerItem | null;
  pointsToRedeem: number;
  onPointsRedeemChange: (points: number) => void;
  pointRedemptionEnabled: boolean;
  onPointRedemptionToggle: (enabled: boolean) => void;
}) {
  const maxPointsToRedeem =
    crmConfig && customer
      ? Math.min(
          customer.loyalty_points || 0,
          crmConfig.max_redemption_pct > 0
            ? Math.floor(((subtotal * crmConfig.max_redemption_pct) / 100) / crmConfig.points_to_currency_ratio)
            : customer.loyalty_points || 0
        )
      : 0;

  const pointDiscountValue =
    pointRedemptionEnabled && crmConfig
      ? Math.floor(pointsToRedeem * crmConfig.points_to_currency_ratio)
      : 0;

  const canRedeemPoints =
    crmConfig &&
    crmConfig.redemption_enabled === 1 &&
    customer &&
    (customer.loyalty_points || 0) >= (crmConfig.min_points_to_redeem || 0);

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
                <Tag size={18} color={theme.primary} />
                <Text style={[dm.sheetTitle, { color: theme.text }]}>Select Discount</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={dm.closeBtn}
              >
                <X size={20} color={theme.textSecondary} />
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
                <XCircle size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[dm.discountName, { color: theme.text }]}>No Discount</Text>
                <Text style={[dm.discountSub, { color: theme.textSecondary }]}>Full price, no deduction</Text>
              </View>
              {!selectedDiscount && (
                <CheckCircle2 size={20} color={theme.primary} />
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
                style={{ maxHeight: 240 }}
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
                        {isPercent ? (
                          <Tag size={18} color={theme.primary} />
                        ) : (
                          <Banknote size={18} color={theme.secondary} />
                        )}
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
                        <CheckCircle2
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

            {/* Point Redemption Section */}
            {canRedeemPoints && (
              <>
                <View style={[dm.divider, { backgroundColor: theme.divider }]} />
                <Pressable
                  style={{
                    padding: 16,
                    backgroundColor: withOpacity(theme.primary, 0.08),
                    borderTopWidth: 1,
                    borderColor: theme.divider,
                  }}
                  onPress={Keyboard.dismiss}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={18} color={theme.primary} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                        Redeem Points (Discount)
                      </Text>
                    </View>
                    <Switch
                      value={pointRedemptionEnabled}
                      onValueChange={(val) => {
                        Keyboard.dismiss();
                        onPointRedemptionToggle(val);
                      }}
                      trackColor={{ false: '#D1D5DB', true: theme.primary }}
                      thumbColor={pointRedemptionEnabled ? theme.primary : '#9CA3AF'}
                    />
                  </View>

                  {pointRedemptionEnabled && (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Available:{' '}
                          <Text style={{ fontWeight: '700', color: theme.primary }}>
                            {customer?.loyalty_points || 0} pts
                          </Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                          Max:{' '}
                          <Text style={{ fontWeight: '700', color: theme.primary }}>
                            {maxPointsToRedeem} pts
                          </Text>
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          style={{
                            flex: 1,
                            height: 38,
                            backgroundColor: theme.card,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: theme.border,
                            paddingHorizontal: 12,
                            fontSize: 14,
                            fontWeight: '700',
                            color: theme.text,
                          }}
                          keyboardType="number-pad"
                          value={pointsToRedeem > 0 ? String(pointsToRedeem) : ''}
                          onChangeText={(text) => {
                            const val = parseInt(text) || 0;
                            onPointsRedeemChange(Math.min(val, maxPointsToRedeem));
                          }}
                          placeholder="Enter points"
                          placeholderTextColor={theme.textTertiary}
                        />
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: theme.primary,
                            borderRadius: 8,
                          }}
                          onPress={() => {
                            Keyboard.dismiss();
                            onPointsRedeemChange(maxPointsToRedeem);
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>MAX</Text>
                        </TouchableOpacity>
                      </View>

                      {pointDiscountValue > 0 && (
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 4,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}>Discount value:</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.success }}>
                            -{fmt(pointDiscountValue)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              </>
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

  // CRM / Customer state
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [crmConfig, setCrmConfig] = useState<CRMConfigItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointRedemptionEnabled, setPointRedemptionEnabled] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // Split payment state
  const [splitConfig, setSplitConfig] = useState<{
    splitCount: number;
    splitType: 'equal' | 'custom';
    customAmounts: number[];
  } | null>(null);
  const [currentSplitIndex, setCurrentSplitIndex] = useState(0);
  const [paidSplits, setPaidSplits] = useState<
    Array<{ splitIndex: number; amount: number; paymentMethod: string; provider?: string }>
  >([]);
  const [allSplitsCollected, setAllSplitsCollected] = useState(false);

  // Split configuration inputs
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<number[]>([]);

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
      const [methods, taxes, discList, crmRes, custRes] = await Promise.all([
        dbOperations.getActivePaymentMethods(db),
        dbOperations.getActiveTaxConfigs(db),
        dbOperations.getActiveDiscounts(db),
        CRMProcess.getConfig(db),
        CustomerProcess.getAll(db),
      ]);
      setPaymentMethods(methods);
      setTaxConfigs(taxes);
      setDiscounts(discList);
      if (crmRes.success && crmRes.data) setCrmConfig(crmRes.data);
      if (custRes.success && custRes.data) setCustomers(custRes.data);
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

  // 2. Discount Amount (Preset + Loyalty Point Redemption)
  const discountAmount = calcDiscountAmount(selectedDiscount, subtotal);
  const pointDiscountAmount =
    pointRedemptionEnabled && crmConfig && pointsToRedeem > 0
      ? Math.floor(pointsToRedeem * (crmConfig.points_to_currency_ratio || 0.01))
      : 0;
  const totalDiscount = discountAmount + pointDiscountAmount;
  const afterDiscount = Math.max(0, subtotal - totalDiscount);

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
  const currentSplitAmount = splitConfig ? splitConfig.customAmounts[currentSplitIndex] || 0 : total;
  const paymentAmount = method === 'cash' ? parseFloat(numpadStr) || 0 : currentSplitAmount;
  const change = method === 'cash' ? Math.max(0, paymentAmount - currentSplitAmount) : 0;

  // 5. Available Payment Method Categories (derived dynamically from database + Split)
  const availableMethodTypes = useMemo(() => {
    const types: { key: string; label: string; icon: any }[] = [
      { key: 'cash', label: 'Cash', icon: Banknote },
    ];

    const knownKeys = new Set(['cash']);
    paymentMethods.forEach((m) => {
      if (m.is_active && !knownKeys.has(m.type_key)) {
        knownKeys.add(m.type_key);
        let icon = CreditCard;
        if (m.type_key === 'card') icon = CreditCard;
        else if (m.type_key === 'qris') icon = QrCode;
        else if (m.type_key === 'transfer') icon = Smartphone;
        else if (m.type_key === 'ewallet') icon = Wallet;

        types.push({
          key: m.type_key,
          label: m.type_label || (m.type_key === 'card' ? 'Card' : m.type_key.toUpperCase()),
          icon,
        });
      }
    });

    // Add Split Pay option to top/left methods
    types.push({ key: 'split', label: 'Split', icon: Divide });

    return types;
  }, [paymentMethods]);

  // Providers list for current non-cash method
  const activeProvidersForMethod = useMemo(() => {
    if (method === 'cash' || method === 'split') return [];
    const matching = paymentMethods.filter((m) => m.type_key === method && m.is_active);
    return matching.map((m) => m.method_name);
  }, [method, paymentMethods]);

  // Smart Quick Amounts based on total and currency
  const quickAmounts = useMemo(() => {
    const targetAmt = splitConfig ? currentSplitAmount : total;
    const list = new Set<number>();
    if (targetAmt > 0) list.add(targetAmt);

    if (currency?.code === 'IDR' || currency?.decimals === 0) {
      const base = [10000, 20000, 50000, 100000, 200000, 500000];
      if (targetAmt > 0) {
        const round10k = Math.ceil(targetAmt / 10000) * 10000;
        const round50k = Math.ceil(targetAmt / 50000) * 50000;
        const round100k = Math.ceil(targetAmt / 100000) * 100000;
        if (round10k > targetAmt) list.add(round10k);
        if (round50k > targetAmt) list.add(round50k);
        if (round100k > targetAmt) list.add(round100k);
      }
      base.forEach((b) => {
        if (b >= targetAmt) list.add(b);
      });
    } else {
      const base = [5, 10, 20, 50, 100, 200];
      if (targetAmt > 0) {
        const round1 = Math.ceil(targetAmt);
        const round5 = Math.ceil(targetAmt / 5) * 5;
        const round10 = Math.ceil(targetAmt / 10) * 10;
        const round20 = Math.ceil(targetAmt / 20) * 20;
        if (round1 > targetAmt) list.add(round1);
        if (round5 > targetAmt) list.add(round5);
        if (round10 > targetAmt) list.add(round10);
        if (round20 > targetAmt) list.add(round20);
      }
      base.forEach((b) => {
        if (b >= targetAmt) list.add(b);
      });
    }
    return Array.from(list).sort((a, b) => a - b).slice(0, 8);
  }, [total, currentSplitAmount, splitConfig, currency]);

  const isNonCash = method !== 'cash' && method !== 'split';
  const isBankMethod = method === 'qris' || method === 'transfer' || method === 'card';

  const canConfirm =
    (method === 'split' && !splitConfig) ||
    (allSplitsCollected && splitConfig) ||
    (splitConfig &&
      !allSplitsCollected &&
      paymentAmount >= currentSplitAmount &&
      method !== 'split' &&
      (!isBankMethod || selectedBank !== null)) ||
    (!splitConfig &&
      subtotal > 0 &&
      paymentAmount >= currentSplitAmount &&
      (method === 'cash' ? paymentAmount >= total : selectedBank !== null));

  const shortfall = currentSplitAmount - paymentAmount;

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

    // A. Start split payment configuration
    if (method === 'split' && !splitConfig) {
      let amounts: number[] = [];
      if (splitType === 'equal') {
        const perPerson = Math.round((total / splitCount) * 100) / 100;
        amounts = Array(splitCount).fill(perPerson);
        const sum = amounts.reduce((a, b) => a + b, 0);
        amounts[splitCount - 1] = Math.round((amounts[splitCount - 1] + (total - sum)) * 100) / 100;
      } else {
        amounts = customAmounts.length === splitCount ? [...customAmounts] : Array(splitCount).fill(0);
        const sum = amounts.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - total) > 1) {
          Alert.alert(
            'Invalid Split Total',
            `Sum of custom amounts (${fmt(sum)}) must equal total order (${fmt(total)}).`
          );
          return;
        }
      }

      setSplitConfig({
        splitCount,
        splitType,
        customAmounts: amounts,
      });
      setCurrentSplitIndex(0);
      setPaidSplits([]);
      setAllSplitsCollected(false);
      setMethod('cash');
      setNumpadStr('');
      setSelectedBank(null);
      return;
    }

    // B. Collect individual split payment
    if (splitConfig && !allSplitsCollected) {
      const thisSplitPayment = {
        splitIndex: currentSplitIndex,
        amount: currentSplitAmount,
        paymentMethod: method,
        provider: selectedBank || undefined,
      };

      const updatedPaidSplits = [...paidSplits, thisSplitPayment];
      setPaidSplits(updatedPaidSplits);

      if (updatedPaidSplits.length === splitConfig.splitCount) {
        setAllSplitsCollected(true);
        Alert.alert(
          'All Splits Collected',
          'All split payments have been collected. Tap "Confirm Payment" to finish the order.'
        );
      } else {
        const nextIndex = currentSplitIndex + 1;
        setCurrentSplitIndex(nextIndex);
        setMethod('cash');
        setNumpadStr('');
        setSelectedBank(null);
      }
      return;
    }

    // C. Final order checkout confirmation
    setConfirming(true);
    try {
      const db = await getDatabase();
      const displayMethodName = splitConfig
        ? 'SPLIT PAYMENT'
        : (method === 'qris' || method === 'transfer' || method === 'card') && selectedBank
        ? `${method.toUpperCase()} | ${selectedBank}`
        : method.toUpperCase();

      const result = await CheckoutProcess.processCheckout({
        cart,
        subtotal,
        total,
        paymentMethod: displayMethodName,
        paymentAmount: method === 'cash' && !splitConfig ? paymentAmount : total,
        selectedBank: isNonCash ? selectedBank : null,
        selectedDiscount,
        discountAmount: totalDiscount,
        taxAmount,
        serviceAmount,
        change: splitConfig ? 0 : change,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        isSplit: !!splitConfig,
      });

      if (!result.success || !result.order) {
        Alert.alert('Payment Error', (result.errors || ['Validation failed']).join('\n'));
        return;
      }

      // Record split payment details if split
      if (splitConfig && paidSplits.length > 0) {
        await dbOperations.createOrderSplits(
          db,
          result.order.id,
          paidSplits.map((s) => ({
            splitIndex: s.splitIndex,
            totalSplits: splitConfig.splitCount,
            amount: s.amount,
            paymentMethod: s.paymentMethod,
            paymentProvider: s.provider,
            customerId: selectedCustomer?.id,
          }))
        );
      }

      // Handle CRM Loyalty Points Earning & Redemption
      if (selectedCustomer && crmConfig) {
        if (crmConfig.loyalty_enabled === 1 && total >= (crmConfig.min_transaction_for_points || 0)) {
          const earnedPts = Math.floor(total * (crmConfig.points_per_currency || 0.01));
          if (earnedPts > 0) {
            const dbRef = await getDatabase();
            await dbOperations.updateCustomerPoints(
              dbRef,
              selectedCustomer.id,
              earnedPts,
              'earn',
              result.order.id,
              result.order.order_number,
              'Earned points from order'
            );
          }
        }

        if (pointRedemptionEnabled && pointsToRedeem > 0) {
          const dbRef = await getDatabase();
          await dbOperations.updateCustomerPoints(
            dbRef,
            selectedCustomer.id,
            -pointsToRedeem,
            'redeem',
            result.order.id,
            result.order.order_number,
            'Redeemed points for discount'
          );
        }
      }

      CartProcess.clearCart();
      setCompletedReceipt(result.order);
    } catch (error: any) {
      console.error('Payment failed:', error);
      Alert.alert('Payment Failed', error?.message || 'An unexpected error occurred during payment processing.');
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscountSelect = (d: DiscountItem | null) => {
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

  const handleCustomerSelect = (customer: CustomerItem | null) => {
    setSelectedCustomer(customer);
    setCustomerPickerVisible(false);
  };

  // Convert customers to dropdown options
  const customerDropdownOptions = [
    { label: 'No Customer', value: '' },
    ...customers.map((c) => ({
      label: c.name,
      value: String(c.id),
    })),
  ];

  // Convert discounts to dropdown options with details
  const discountDropdownOptions = [
    { label: 'No Discount', value: '' },
    ...discounts.map((d) => ({
      label: `${d.name} (${d.type === 'percentage' ? `${d.value}%` : fmt(d.value)})`,
      value: String(d.id),
    })),
  ];

  // Header Right Button (3-dot menu)
  const headerRight = (
    <TouchableOpacity onPress={() => setActionSheetVisible(true)}>
      <MoreVertical size={22} color={theme.text} />
    </TouchableOpacity>
  );

  // Dynamic summary items mapping list (Exact original structure)
  const summaryItems = useMemo(() => {
    const items: { label: string; value: string; accent?: boolean; green?: boolean; red?: boolean }[] = [];
    
    items.push({ label: 'Subtotal', value: fmt(subtotal) });

    if (totalDiscount > 0) {
      items.push({ label: 'Discount', value: `-${fmt(totalDiscount)}`, red: true });
    }
    if (serviceAmount > 0) {
      items.push({ label: `Service (${serviceRate}%)`, value: fmt(serviceAmount) });
    }
    if (taxAmount > 0) {
      items.push({ label: `Tax (${taxRate}%)`, value: fmt(taxAmount) });
    }

    items.push({
      label: splitConfig ? `${getOrdinal(currentSplitIndex + 1)} Split` : 'Total',
      value: fmt(splitConfig ? currentSplitAmount : total),
      accent: true,
    });
    items.push({ label: 'Paid', value: fmt(paymentAmount) });
    items.push({ label: 'Change', value: fmt(change), green: change > 0 });

    return items;
  }, [subtotal, totalDiscount, serviceAmount, serviceRate, taxAmount, taxRate, total, splitConfig, currentSplitIndex, currentSplitAmount, paymentAmount, change]);

  const mobileSummary = (
    <View style={[styles.summaryGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {summaryItems.map((item, index) => (
        <SummaryCell
          key={index}
          label={item.label}
          value={item.value}
          accent={item.accent}
          green={item.green}
          red={item.red}
          theme={theme}
          styles={styles}
          itemCount={summaryItems.length}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.background }]}>
      <Header
        title="Payment Checkout"
        leftIcon={<ArrowLeft size={22} color={theme.text} />}
        onLeftPress={() => router.back()}
        rightIcon={headerRight}
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

            {/* Split Progress Banner if Split Active */}
            {splitConfig && (
              <View
                style={{
                  // marginHorizontal: 12,
                  // marginBottom: 10,
                  padding: 12,
                  // borderRadius: 10,
                  backgroundColor: withOpacity(theme.primary, 0.1),
                  borderWidth: 1,
                  borderColor: theme.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary }}>
                    Split {currentSplitIndex + 1} of {splitConfig.splitCount} ({fmt(currentSplitAmount)})
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                    {paidSplits.length}/{splitConfig.splitCount} splits collected
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: theme.input,
                  }}
                  onPress={() => {
                    setSplitConfig(null);
                    setPaidSplits([]);
                    setAllSplitsCollected(false);
                    setMethod('cash');
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.error }}>Reset Split</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
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
                    const IconComponent = m.icon;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.methodCard,
                          {
                            minWidth: isWide ? undefined : 84,
                            backgroundColor: isActive ? withOpacity(theme.primary, 0.15) : theme.input,
                            borderColor: isActive ? theme.primary : theme.inputBorder,
                            opacity: splitConfig && m.key === 'split' ? 0.5 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (splitConfig && m.key === 'split') return;
                          setMethod(m.key);
                          setNumpadStr('');
                          setSelectedBank(null);
                        }}
                        disabled={!!(splitConfig && m.key === 'split')}
                      >
                        <IconComponent
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

              <View style={[styles.contextCol, { backgroundColor: theme.background }]}>
                {method === 'split' && !splitConfig ? (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, padding: 8 }}>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
                        How to Split?
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: splitType === 'equal' ? theme.primary : theme.border,
                            backgroundColor: splitType === 'equal' ? withOpacity(theme.primary, 0.1) : theme.card,
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onPress={() => setSplitType('equal')}
                        >
                          <Users size={18} color={splitType === 'equal' ? theme.primary : theme.textSecondary} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: splitType === 'equal' ? theme.primary : theme.text }}>
                            Equal
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>Same amount</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: splitType === 'custom' ? theme.primary : theme.border,
                            backgroundColor: splitType === 'custom' ? withOpacity(theme.primary, 0.1) : theme.card,
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onPress={() => setSplitType('custom')}
                        >
                          <Coins size={18} color={splitType === 'custom' ? theme.primary : theme.textSecondary} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: splitType === 'custom' ? theme.primary : theme.text }}>
                            Custom
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.textSecondary }}>Set amounts</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Number of People Counter */}
                    <View style={{ backgroundColor: theme.card, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
                        Number of People
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                        <TouchableOpacity
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            backgroundColor: theme.input,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          onPress={() => setSplitCount(Math.max(2, splitCount - 1))}
                        >
                          <Minus size={20} color={theme.primary} />
                        </TouchableOpacity>
                        <View style={{ alignItems: 'center', minWidth: 70 }}>
                          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text }}>{splitCount}</Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary }}>people</Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            backgroundColor: theme.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          onPress={() => setSplitCount(Math.min(10, splitCount + 1))}
                        >
                          <Plus size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Amount Breakdown Preview */}
                    <View
                      style={{
                        backgroundColor: withOpacity(theme.primary, 0.08),
                        padding: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.primary,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 6 }}>
                        {splitType === 'equal' ? 'Per Person Amount' : 'Custom Amounts'}
                      </Text>
                      {splitType === 'equal' ? (
                        <View>
                          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary }}>
                            {fmt(total / splitCount)}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                            Total: {fmt(total)}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {Array.from({ length: splitCount }).map((_, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 75, backgroundColor: theme.card, padding: 8, borderRadius: 6, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary }}>Person {i + 1}</Text>
                              </View>
                              <TextInput
                                style={{
                                  flex: 1,
                                  height: 38,
                                  borderWidth: 1,
                                  borderColor: theme.primary,
                                  borderRadius: 6,
                                  paddingHorizontal: 10,
                                  fontSize: 14,
                                  backgroundColor: theme.card,
                                  color: theme.text,
                                  fontWeight: '600',
                                }}
                                placeholder="0"
                                placeholderTextColor={theme.textTertiary}
                                keyboardType="numeric"
                                value={customAmounts[i]?.toString() || ''}
                                onChangeText={(text) => {
                                  const newAmounts = [...customAmounts];
                                  newAmounts[i] = parseFloat(text) || 0;
                                  setCustomAmounts(newAmounts);
                                }}
                              />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </ScrollView>
                ) : method === 'cash' ? (
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
                      {confirming
                        ? 'Processing...'
                        : method === 'split' && !splitConfig
                        ? 'Start Split Payment'
                        : splitConfig && !allSplitsCollected
                        ? `Collect Split #${currentSplitIndex + 1}`
                        : 'Confirm Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

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
                    <Tag size={14} color={theme.primary} />
                    <Text style={[styles.wideDiscountName, { color: theme.primary }]}>
                      {selectedDiscount?.name || 'Discount'}
                    </Text>
                  </View>
                  <Text style={[styles.wideDiscountAmt, { color: theme.error }]}>
                    -{fmt(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.rightSummaryLine}>
                <Text style={[styles.rightSummaryLabel, { color: theme.textSecondary }]}>
                  Subtotal
                </Text>
                <Text style={[styles.rightSummaryValue, { color: theme.text }]}>
                  {fmt(subtotal)}
                </Text>
              </View>

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

      {/* Cart Modal (Mobile) - Redesigned to Sheet UI Style */}
      <Modal
        visible={cartModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setCartModalVisible(false)}>
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
              <Pressable style={[dm.sheetHeader, { borderBottomColor: theme.divider }]}>
                <View style={dm.sheetTitleRow}>
                  <Tag size={18} color={theme.primary} />
                  <Text style={[dm.sheetTitle, { color: theme.text }]}>
                    Order Items ({cart.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCartModalVisible(false)} style={dm.closeBtn}>
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                {cart.map((item) => (
                  <View
                    key={item.productId}
                    style={[
                      styles.cartItem,
                      {
                        backgroundColor: theme.card,
                        borderBottomColor: theme.divider,
                        borderBottomWidth: 1,
                        paddingHorizontal: 20,
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

              <View style={[dm.sheetFooter, { borderTopColor: theme.divider, paddingHorizontal: 20 }]}>
                <View style={styles.modalTotalRow}>
                  <Text style={[styles.modalTotalLabel, { color: theme.text }]}>Total:</Text>
                  <Text style={[styles.modalTotalVal, { color: theme.primary }]}>{fmt(total)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.confirmBtnMain,
                    { backgroundColor: theme.primary, width: '100%', flex: undefined, height: 48 },
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        visible={customerPickerVisible}
        customers={customers}
        loading={false}
        selectedCustomer={selectedCustomer}
        onCustomerSelect={handleCustomerSelect}
        onClose={() => setCustomerPickerVisible(false)}
        theme={theme}
      />

      {/* Discount Picker Modal (with Loyalty Point Redemption) */}
      <DiscountPickerModal
        visible={discountPickerVisible}
        discounts={discounts}
        loading={false}
        selectedDiscount={selectedDiscount}
        onDiscountSelect={handleDiscountSelect}
        subtotal={subtotal}
        crmConfig={crmConfig}
        customer={selectedCustomer}
        pointsToRedeem={pointsToRedeem}
        onPointsRedeemChange={setPointsToRedeem}
        pointRedemptionEnabled={pointRedemptionEnabled}
        onPointRedemptionToggle={setPointRedemptionEnabled}
        onClose={() => setDiscountPickerVisible(false)}
        theme={theme}
      />

      {/* Action Sheet */}
      <ActionSheetFormSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        customerOptions={customerDropdownOptions}
        selectedCustomer={selectedCustomer ? String(selectedCustomer.id) : ''}
        onCustomerSelect={(value) => {
          if (value === '') {
            setSelectedCustomer(null);
            return;
          }
          const customer = customers.find((c) => String(c.id) === value);
          setSelectedCustomer(customer || null);
        }}
        discountOptions={discountDropdownOptions}
        selectedDiscount={selectedDiscount ? String(selectedDiscount.id) : ''}
        onDiscountSelect={(value) => {
          if (value === '') {
            setSelectedDiscount(null);
            return;
          }
          const discount = discounts.find((d) => String(d.id) === value);
          if (discount) {
            const validation = CheckoutProcess.validateDiscountSelection(discount, subtotal);
            if (!validation.isValid) {
              Alert.alert('Discount Ineligible', validation.errors.join('\n'));
              return;
            }
          }
          setSelectedDiscount(discount || null);
        }}
      />

      {/* Receipt Success Dialog */}
      <Modal visible={completedReceipt !== null} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.receiptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.receiptIconBox}>
              <CheckCircle size={54} color={theme.success} />
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
              <FileText size={18} color="#FFFFFF" />
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
      paddingVertical: 6,
      paddingHorizontal: 4,
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
      height: 70,
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
      marginBottom:10,
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
      // marginBottom:10,
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
    marginBottom:10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});