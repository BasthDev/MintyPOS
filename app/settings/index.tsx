import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { Settings } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';

export default function SettingsScreen() {
  const { theme, colorMode, toggleColorMode } = useTheme();

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure your preferences</Text>
      
      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Appearance</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Theme Mode</Text>
          <Text style={styles.settingValue}>{colorMode === 'dark' ? 'Dark' : 'Light'}</Text>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>Business</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Store Name</Text>
          <Text style={styles.settingValue}>MintyPOS Store</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Currency</Text>
          <Text style={styles.settingValue}>Rp (Indonesian Rupiah)</Text>
        </View>
      </View>

      <View style={styles.settingsGroup}>
        <Text style={styles.groupTitle}>System</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Database Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>
    </View>
  );

  const rightPanel = (
    <View style={styles.settingsPanel}>
      <Text style={styles.listTitle}>Quick Actions</Text>
      <View style={styles.actionItem}>
        <Text style={styles.actionTitle}>Toggle Theme</Text>
        <Text style={styles.actionDesc}>Switch between light and dark mode</Text>
      </View>
      <View style={styles.actionItem}>
        <Text style={styles.actionTitle}>Clear Cache</Text>
        <Text style={styles.actionDesc}>Clear temporary files and data</Text>
      </View>
      <View style={styles.actionItem}>
        <Text style={styles.actionTitle}>Export Data</Text>
        <Text style={styles.actionDesc}>Export database and settings</Text>
      </View>
      <View style={styles.actionItem}>
        <Text style={styles.actionTitle}>Reset Database</Text>
        <Text style={styles.actionDesc}>Reset all data to factory settings</Text>
      </View>
    </View>
  );

  return (
    <>
      <Header title="Settings" />
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
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 14,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsPanel: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
  },
});