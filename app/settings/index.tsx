import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import {
  BookOpen,
  ChevronRight,
  HelpCircle,
  Layers,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  SunMoon,
  UtensilsCrossed,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { theme, colorMode, toggleColorMode } = useTheme();
  const [selectedSetting, setSelectedSetting] = useState<string | null>('guide');

  const settingGroups = [
    { id: 'guide', name: 'User Guide', desc: 'Complete manual & instructions on how to use MintyPOS', icon: BookOpen },
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

      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
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
                Welcome to MintyPOS! Master your Point of Sale, Inventory Management, Recipe Costing (HPP), and Stock Deductions.
              </Text>
            </View>

            {/* Guide Step 1: POS & Checkout */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <ShoppingCart size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>1. Point of Sale & Checkout</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Tap any product in the Catalog on the main POS screen to add it to your active Cart.{'\n'}
                • Adjust quantities with + / - buttons or swipe to remove items.{'\n'}
                • Review total price, tax, and discounts.{'\n'}
                • Tap "Checkout" to complete the transaction. The system automatically executes FIFO/FEFO stock deductions for linked ingredients and product inventory.
              </Text>
            </View>

            {/* Guide Step 2: Products & Dynamic HPP */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Package size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>2. Products & Dynamic HPP / Images</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Go to the "Products" screen to view catalog items, images, and live profit margins.{'\n'}
                • Tap "+ New Product" to create an item. You can upload an image, scan barcodes/SKUs, assign categories, and set selling prices.{'\n'}
                • Choose "Deduct from Product Stock" for direct retail items or "Deduct from Recipe Ingredients" for food/beverages made from raw materials.{'\n'}
                • Dynamic HPP (Harga Pokok Penjualan) and margins are calculated automatically in real-time from linked recipes or buy prices!
              </Text>
            </View>

            {/* Guide Step 3: Raw Ingredients & Unit Conversions */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Layers size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>3. Ingredients & Inventory Batches</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • Register base ingredients (e.g. Coffee Beans in grams, Milk in ml, Sugar in grams).{'\n'}
                • Set custom conversion units (e.g. 1 kg = 1000 g, 1 Liter = 1000 ml) to buy in bulk and use in grams.{'\n'}
                • In the "Inventory" screen, tap "+ Restock Batch" whenever you purchase new stock from suppliers.{'\n'}
                • Enter purchase cost and optional expiration dates. MintyPOS uses FEFO/FIFO tracking to cost out oldest/expiring batches first.
              </Text>
            </View>

            {/* Guide Step 4: Recipes & COGS Breakdown */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <UtensilsCrossed size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>4. Recipes & Cost Estimation</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • In the "Recipes" screen, tap "+ New Recipe" to build composite recipes (e.g. Cappuccino = 18g espresso beans + 150ml milk).{'\n'}
                • You can edit existing recipes at any time by selecting them from the list and clicking the Edit button.{'\n'}
                • Recipe costs update dynamically as new ingredient batches with different purchase prices are received.
              </Text>
            </View>

            {/* Guide Step 5: Sales Receipts & Audits */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <Receipt size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>5. Orders, Receipts & Activity Audit</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • "Orders" tab preserves full transaction histories, itemized receipts, payment details, and date-time stamps.{'\n'}
                • "Activity Log" tracks all stock movements (stock additions, manual adjustments, deductions, and restocks) with a real-time audit trail.
              </Text>
            </View>

            {/* Guide Step 6: Responsive Layouts */}
            <View style={[styles.guideCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 24 }]}>
              <View style={styles.guideCardHeader}>
                <View style={[styles.guideStepBadge, { backgroundColor: theme.primary }]}>
                  <HelpCircle size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.guideCardTitle, { color: theme.text }]}>6. Mobile & Tablet Navigation</Text>
              </View>
              <Text style={[styles.guideBodyText, { color: theme.textSecondary }]}>
                • On Tablet: Side-by-side split screen shows your list on the left and full details on the right simultaneously. Click the Back button on the right panel to close details.{'\n'}
                • On Mobile: Tapping any list item slides open the Next Screen with complete action buttons and a top Back Button to return.
              </Text>
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
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Currency:</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>Rp (Indonesian Rupiah)</Text>
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
          </View>
        )}
      </ScrollView>
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
});