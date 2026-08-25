import { Header } from '@/components/Header';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { Settings, Shield, Store, SunMoon } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { theme, colorMode, toggleColorMode } = useTheme();
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);

  const settingGroups = [
    { id: 'appearance', name: 'Appearance', desc: 'Theme mode and visual options', icon: SunMoon },
    { id: 'business', name: 'Business Info', desc: 'Store name, currency, and address', icon: Store },
    { id: 'system', name: 'System & Security', desc: 'App version, database status, and backup', icon: Shield },
  ];

  // --- LEFT PANEL (Main Screen) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Configure your preferences</Text>

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
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // --- RIGHT PANEL (Setting Details) ---
  const rightPanel = selectedSetting ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.detailsTitle, { color: theme.text }]}>
          {settingGroups.find((g) => g.id === selectedSetting)?.name} Settings
        </Text>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
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
        Select a settings category from the list to view and edit preferences.
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
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
    gap: 12,
  },
  cardIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '700',
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
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