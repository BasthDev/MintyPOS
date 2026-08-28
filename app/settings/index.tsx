import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { CURRENCY_PRESETS, CurrencyConfig, DEFAULT_CURRENCY } from '@/constants/currencies';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import {
  Award,
  BarChart3,
  Banknote,
  BookOpen,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  Divide,
  DollarSign,
  Edit3,
  Globe,
  HelpCircle,
  Layers,
  Package,
  Receipt,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  SunMoon,
  TrendingUp,
  UtensilsCrossed,
  Users,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { theme, colorMode, toggleColorMode } = useTheme();
  const currency = useStore((state) => state.currency) || DEFAULT_CURRENCY;
  const setCurrency = useStore((state) => state.setCurrency);
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [currencySearch, setCurrencySearch] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customCode, setCustomCode] = useState(currency.code);
  const [customSymbol, setCustomSymbol] = useState(currency.symbol);
  const [customName, setCustomName] = useState(currency.name);
  const [customPosition, setCustomPosition] = useState<'prefix' | 'suffix'>(currency.position);
  const [customDecimals, setCustomDecimals] = useState(String(currency.decimals));

  const settingGroups = [
    { id: 'guide', name: 'User Guide', desc: 'Complete manual & instructions on how to use MintyPOS', icon: BookOpen },
    { id: 'currency', name: 'Currency & Formatting', desc: `Current: ${currency.symbol} (${currency.code})`, icon: Coins },
    { id: 'appearance', name: 'Appearance', desc: 'Theme mode and visual display options', icon: SunMoon },
    { id: 'business', name: 'Business Info', desc: 'Store name, currency, and address', icon: Store },
    { id: 'system', name: 'System & Security', desc: 'App version, database status, and backup', icon: Shield },
  ];

  // --- LEFT PANEL (Main Screen: Settings Categories) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Settings & Documentation</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Configure preferences & learn how to use MintyPOS
      </Text>

      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {settingGroups.map((group) => {
          const isSelected = selectedSetting === group.id;
          const IconComp = group.icon;

          return (
            <TouchableOpacity
              key={group.id}
              activeOpacity={0.7}
              style={[
                styles.settingCard,
                {
                  backgroundColor: isSelected ? theme.primary : theme.card,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setSelectedSetting(group.id)}
            >
              <View style={styles.cardMain}>
                <View style={[styles.cardIconBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.input }]}>
                  <IconComp size={22} color={isSelected ? '#FFFFFF' : theme.primary} />
                </View>
                <View style={styles.cardHeaderInfo}>
                  <Text
                    style={[
                      styles.cardName,
                      { color: isSelected ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {group.name}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubText,
                      { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                    ]}
                  >
                    {group.desc}
                  </Text>
                </View>
                <ChevronRight
                  size={20}
                  color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // --- RIGHT PANEL (Setting & Guide Content) ---
  const rightPanel = selectedSetting ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.detailsTitle, { color: theme.text }]}>
          {settingGroups.find((g) => g.id === selectedSetting)?.name}
        </Text>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        {/* --- USER GUIDE SECTION --- */}
        {selectedSetting === 'guide' && (
          <View style={styles.guideContainer}>
            {/* Guide Introduction */}
            <View style={[styles.guideHeroCard, { backgroundColor: theme.primary }]}>
              <BookOpen size={32} color="#FFFFFF" />
              <Text style={styles.guideHeroTitle}>MintyPOS User Guide</Text>
              <Text style={styles.guideHeroSubtitle}>
                Welcome to MintyPOS — your all-in-one POS, Inventory, Recipe Costing, CRM & Loyalty, Split Payment, and Reports system.
              </Text>
            </View>

            {/* Step 1: POS & Checkout */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <ShoppingCart size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>1. Point of Sale & Checkout</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Tap any product in the Catalog on the main POS screen to add it to the active Cart.{'\n'}
                • Adjust quantities using the + / – buttons or long-press to remove items.{'\n'}
                • Tap the cart icon to review your order, or tap "Charge" to proceed to Payment.{'\n'}
                • On the Payment screen: select a discount, choose a payment method, enter the amount, then tap Confirm Payment.{'\n'}
                • The system automatically executes FIFO/FEFO stock deductions for linked ingredients and product inventory upon confirmation.
              </Text>
            </View>

            {/* Step 2: Split Payment */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Divide size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>2. Split Payment</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • On the Payment screen, tap "Split" in the payment method bar (top-left area).{'\n'}
                • Select how many ways to split: 2, 3, or 4 parties.{'\n'}
                • Each split payer can use a different payment method (Cash, QRIS, Bank Transfer).{'\n'}
                • Enter the amount for each split — remaining balance updates in real-time.{'\n'}
                • Confirm each split payment individually. All splits are saved and linked to the parent order in the Orders screen.
              </Text>
            </View>

            {/* Step 3: Products & Dynamic HPP */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Package size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>3. Products & HPP / COGS</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Go to "Products" to view your catalog with live profit margins.{'\n'}
                • For recipe-based products: the cost label shows "HPP: Rp xxxx" — calculated dynamically from ingredient batch prices.{'\n'}
                • For manually-priced products: the label shows "Buy: Rp xxxx" — based on your set buy price.{'\n'}
                • Both show the margin % in green next to the cost.{'\n'}
                • Choose stock deduction mode: "Product Stock" for retail items, "Recipe Ingredients" for food/beverages, or "None" for services.
              </Text>
            </View>

            {/* Step 4: Ingredients & Inventory Batches */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Layers size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>4. Ingredients & Inventory</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Register base ingredients (e.g. Coffee Beans in grams, Milk in ml, Sugar in grams).{'\n'}
                • Set custom conversion units (e.g. 1 kg = 1000 g, 1 L = 1000 ml) to buy in bulk.{'\n'}
                • In the "Inventory" screen, tap "+ Restock Batch" whenever you purchase new stock from a supplier.{'\n'}
                • Enter purchase cost and optional expiration dates. MintyPOS uses FEFO/FIFO — oldest/expiring batches are deducted first.{'\n'}
                • Low stock alerts trigger when current stock drops below the configured minimum threshold.
              </Text>
            </View>

            {/* Step 5: Recipes */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <UtensilsCrossed size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>5. Recipes & Cost Estimation</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • In "Recipes", tap "+ New Recipe" to build composite recipes (e.g. Cappuccino = 18g beans + 150ml milk).{'\n'}
                • Edit existing recipes by selecting them and tapping Edit — changes apply to all linked products immediately.{'\n'}
                • Recipe HPP costs update dynamically as new ingredient batches with different purchase prices arrive.{'\n'}
                • Assign a recipe to a product in the Product Form — the product's HPP will be calculated from the recipe automatically.
              </Text>
            </View>

            {/* Step 6: Customers & CRM */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Users size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>6. Customers & CRM</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Go to "Customers" to create and manage customer profiles (name, phone, email).{'\n'}
                • Each customer has a Tier (Regular → Bronze → Silver → Gold) based on total spending — upgrades automatically.{'\n'}
                • Tap "Deposit Store Credit" to add pre-paid credit to a customer's account for future purchases.{'\n'}
                • View each customer's loyalty points balance, store credit, total spend, and full transaction history.{'\n'}
                • On the Payment screen, tap the Customer icon to attach a customer to the current order before checkout.
              </Text>
            </View>

            {/* Step 7: Loyalty Program */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Award size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>7. Loyalty Points & Redemption</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Go to "CRM & Loyalty" to configure the entire loyalty program.{'\n'}
                • Set: points per currency unit earned, minimum transaction to earn, point-to-currency conversion ratio.{'\n'}
                • Set tier upgrade thresholds (Bronze / Silver / Gold) and toggle automatic tier upgrades.{'\n'}
                • On the Payment screen, tap the Discount icon — if a customer is attached and loyalty is enabled, you'll see a "Redeem Points" toggle.{'\n'}
                • Enter how many points to redeem — the discount is calculated automatically and subtracted from the total.
              </Text>
            </View>

            {/* Step 8: Orders & Activity */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Receipt size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>8. Orders, Receipts & Audit</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • "Orders" shows all completed transactions with itemized receipts, payment details, customer info, and timestamps.{'\n'}
                • Split orders show a SPLIT badge — tap to see each individual split payment method and amount.{'\n'}
                • Orders linked to customers show the customer's name and loyalty points earned.{'\n'}
                • "Activity Log" tracks all stock movements in real-time: restocks, deductions, and order events.
              </Text>
            </View>

            {/* Step 9: Reports */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <BarChart3 size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>9. Reports & Analytics</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • "Reports" offers 4 report types: Sales, Inventory, Profit & Margin, and CRM & Loyalty.{'\n'}
                • Filter by time period: Today, This Week, This Month, or All Time.{'\n'}
                • Sales Report: total revenue, orders, average order value, top-selling products, hourly patterns.{'\n'}
                • Profit Report: revenue, COGS, gross profit, margin %, and product-level profitability.{'\n'}
                • CRM Report: tier breakdown, top customers, total points issued vs redeemed, loyalty activity.
              </Text>
            </View>

            {/* Step 10: Navigation */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 24 }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <HelpCircle size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>10. Mobile & Tablet Navigation</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • On Tablet: Side-by-side split screen shows your list on the left and full details on the right simultaneously.{'\n'}
                • On Mobile: Tapping any list item slides open the next screen. Tap the Back button at the top to return.{'\n'}
                • Open the navigation Drawer from the menu icon on any screen header to switch between modules.{'\n'}
                • Settings → Currency lets you configure your local currency symbol, code, and decimal places.{'\n'}
                • Settings → Appearance lets you toggle between Light and Dark mode.
              </Text>
            </View>
          </View>
        )}

        {/* --- CURRENCY SECTION --- */}
        {selectedSetting === 'currency' && (
          <View style={{ gap: 16, paddingBottom: 40 }}>
            {/* Active Currency Banner */}
            <View
              style={[
                styles.activeCurrencyCard,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
            >
              <View style={styles.activeCurrencyHeader}>
                <View style={styles.activeCurrencyBadge}>
                  <Text style={styles.activeCurrencySymbol}>{currency.symbol}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeCurrencyTitle}>{currency.name}</Text>
                  <Text style={styles.activeCurrencyCode}>
                    Code: {currency.code} • Position: {currency.position} • {currency.decimals} Decimals
                  </Text>
                </View>
              </View>

              {/* Live Preview Box */}
              <View style={[styles.previewBox, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <Text style={styles.previewBoxTitle}>Live Formatted Previews:</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Small:</Text>
                  <Text style={styles.previewValue}>{formatCurrency(1500)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Price:</Text>
                  <Text style={styles.previewValue}>{formatCurrency(25000)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Large Total:</Text>
                  <Text style={styles.previewValue}>{formatCurrency(1250000)}</Text>
                </View>
              </View>
            </View>

            {/* Custom Currency Trigger Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.customCurrencyBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => {
                setCustomCode(currency.code);
                setCustomSymbol(currency.symbol);
                setCustomName(currency.name);
                setCustomPosition(currency.position);
                setCustomDecimals(String(currency.decimals));
                setCustomModalVisible(true);
              }}
            >
              <View style={styles.customBtnLeft}>
                <Edit3 size={18} color={theme.primary} />
                <Text style={[styles.customBtnText, { color: theme.text }]}>
                  Customize Current Currency / Add Custom
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textTertiary || '#888'} />
            </TouchableOpacity>

            {/* Search Bar for Currency Presets */}
            <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Search size={18} color={theme.iconSecondary || theme.textTertiary} />
              <TextInput
                placeholder="Search currency (USD, IDR, EUR, Yen...)"
                placeholderTextColor={theme.textTertiary}
                value={currencySearch}
                onChangeText={setCurrencySearch}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </View>

            {/* Currency Presets Grid */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preset Currencies</Text>
            <View style={styles.presetsGrid}>
              {CURRENCY_PRESETS.filter(
                (p) =>
                  p.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                  p.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                  p.symbol.toLowerCase().includes(currencySearch.toLowerCase())
              ).map((preset) => {
                const isActive = currency.code === preset.code;
                return (
                  <TouchableOpacity
                    key={preset.code}
                    activeOpacity={0.75}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: isActive ? theme.primary : theme.card,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => {
                      setCurrency(preset);
                      Alert.alert('Currency Updated', `Store currency changed to ${preset.name} (${preset.symbol})`);
                    }}
                  >
                    <View style={styles.presetTop}>
                      <Text style={[styles.presetSymbol, { color: isActive ? '#FFFFFF' : theme.primary }]}>
                        {preset.symbol}
                      </Text>
                      {isActive && (
                        <View style={styles.activeCheck}>
                          <Check size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.presetName, { color: isActive ? '#FFFFFF' : theme.text }]} numberOfLines={1}>
                      {preset.name}
                    </Text>
                    <Text style={[styles.presetSample, { color: isActive ? '#E2E8F0' : theme.textSecondary }]}>
                      Sample: {formatCurrency(45000, preset)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* --- APPEARANCE SECTION --- */}
        {selectedSetting === 'appearance' && (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Appearance Options</Text>
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Color Theme</Text>
                <Text style={[styles.rowSublabel, { color: theme.textSecondary }]}>
                  Current: {colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.toggleBtn, { backgroundColor: theme.primary }]}
                onPress={toggleColorMode}
              >
                <Text style={styles.toggleBtnText}>Toggle Theme</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- BUSINESS SECTION --- */}
        {selectedSetting === 'business' && (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Store Details</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Store Name:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>MintyPOS Store</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Active Currency:</Text>
              <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
                {currency.symbol} ({currency.name})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Decimals / Position:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {currency.decimals} decimals • {currency.position}
              </Text>
            </View>
          </View>
        )}

        {/* --- SYSTEM SECTION --- */}
        {selectedSetting === 'system' && (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>System Information</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>App Version:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Database Version:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Active Currency Code:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{currency.code}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Custom Currency Modal */}
      <Modal visible={customModalVisible} transparent animationType="fade" onRequestClose={() => setCustomModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Customize Currency</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Define custom currency symbols, precision, and placement.
            </Text>

            <View style={{ gap: 12, marginVertical: 16 }}>
              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Currency Code (e.g. USD, IDR, CAD)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={customCode}
                  onChangeText={setCustomCode}
                  placeholder="e.g. IDR"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Symbol (e.g. Rp, $, €, £, RM)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={customSymbol}
                  onChangeText={setCustomSymbol}
                  placeholder="e.g. Rp"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="e.g. Indonesian Rupiah"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Symbol Position</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[
                      styles.posChip,
                      {
                        backgroundColor: customPosition === 'prefix' ? theme.primary : theme.input,
                        borderColor: customPosition === 'prefix' ? theme.primary : theme.inputBorder,
                      },
                    ]}
                    onPress={() => setCustomPosition('prefix')}
                  >
                    <Text style={{ color: customPosition === 'prefix' ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 13 }}>
                      Prefix ({customSymbol || '$'} 100)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.posChip,
                      {
                        backgroundColor: customPosition === 'suffix' ? theme.primary : theme.input,
                        borderColor: customPosition === 'suffix' ? theme.primary : theme.inputBorder,
                      },
                    ]}
                    onPress={() => setCustomPosition('suffix')}
                  >
                    <Text style={{ color: customPosition === 'suffix' ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 13 }}>
                      Suffix (100 {customSymbol || '€'})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Decimal Places (0 to 3)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['0', '2', '3'].map((dec) => (
                    <TouchableOpacity
                      key={dec}
                      style={[
                        styles.decChip,
                        {
                          backgroundColor: customDecimals === dec ? theme.primary : theme.input,
                          borderColor: customDecimals === dec ? theme.primary : theme.inputBorder,
                        },
                      ]}
                      onPress={() => setCustomDecimals(dec)}
                    >
                      <Text style={{ color: customDecimals === dec ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 13 }}>
                        {dec} Decimals {dec === '0' ? '(Rp 1.000)' : '($ 10.00)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.input, borderColor: theme.inputBorder, borderWidth: 1 }]}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary, flex: 1.5 }]}
                onPress={() => {
                  if (!customSymbol.trim() || !customCode.trim()) {
                    Alert.alert('Incomplete Data', 'Please provide a symbol and code for the currency.');
                    return;
                  }
                  const newConfig: CurrencyConfig = {
                    code: customCode.trim().toUpperCase(),
                    symbol: customSymbol.trim(),
                    name: customName.trim() || customCode.trim().toUpperCase(),
                    position: customPosition,
                    decimals: parseInt(customDecimals, 10) || 0,
                    decimalSeparator: customDecimals === '0' ? ',' : '.',
                    thousandsSeparator: customDecimals === '0' ? '.' : ',',
                  };
                  setCurrency(newConfig);
                  setCustomModalVisible(false);
                  Alert.alert('Currency Saved', `Active currency set to ${newConfig.name} (${newConfig.symbol})`);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Apply Custom Currency</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Settings size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Setting Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a settings category or user guide from the list.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Settings" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedSetting}
        onBack={() => setSelectedSetting(null)}
        backButtonTitle="Back to Settings"
        childrenPadding={16}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  listScroll: {
    flex: 1,
  },
  settingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubText: {
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailsScroll: {
    flex: 1,
    marginTop: 16,
  },
  guideContainer: {
    gap: 12,
  },
  guideHeroCard: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  guideHeroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  guideHeroSubtitle: {
    color: '#E0F2FE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  guideCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  guideStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  guideBodyText: {
    fontSize: 13,
    lineHeight: 20,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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

  // Currency styles
  activeCurrencyCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeCurrencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  activeCurrencyBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCurrencySymbol: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  activeCurrencyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  activeCurrencyCode: {
    color: '#E0F2FE',
    fontSize: 12,
    marginTop: 2,
  },
  previewBox: {
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  previewBoxTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    opacity: 0.9,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  previewValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  customCurrencyBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  customBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  customBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  presetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetSymbol: {
    fontSize: 18,
    fontWeight: '800',
  },
  activeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
  },
  presetSample: {
    fontSize: 11,
  },

  // Custom Currency Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  posChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});