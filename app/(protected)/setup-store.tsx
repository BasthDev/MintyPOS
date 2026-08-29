import { useAuth } from '@/constants/auth';
import { useTheme } from '@/constants/colorTheme';
import { useStoreContext } from '@/constants/storeContext';
import { CURRENCY_PRESETS } from '@/constants/currencies';
import { initDatabase } from '@/lib/database';
import { OrganizationProcess } from '@/processes/organizationProcess';
import { StoreProcess } from '@/processes/storeProcess';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  Camera,
  Coins,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  Phone,
  Plus,
  Rocket,
  Sparkles,
  Store,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SetupStoreScreen() {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { refreshStoresForUser, setActiveStore } = useStoreContext();

  const [storeName, setStoreName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('IDR');
  const [loading, setLoading] = useState(false);

  const handlePickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleCreateStore = async () => {
    if (!storeName || storeName.trim().length === 0) {
      Alert.alert('Store Name Required', 'Please enter a name for this store or branch');
      return;
    }

    setLoading(true);
    try {
      // 1. Get or create current organization ID
      const orgRes = await OrganizationProcess.getCurrent();
      const orgId = orgRes.data?.id || user?.orgId || 'org_default_' + Date.now();

      const currencyConfig = CURRENCY_PRESETS.find((c) => c.code === selectedCurrency) || {
        code: 'IDR',
        symbol: 'Rp',
      };

      // 2. Create store record
      const res = await StoreProcess.create(orgId, {
        name: storeName.trim(),
        logoUrl: logoUri || undefined,
        address: address.trim(),
        phone: phone.trim(),
        currencyCode: currencyConfig.code,
        currencySymbol: currencyConfig.symbol,
      });

      if (res.success && res.data) {
        // 3. Initialize isolated database for this store
        await initDatabase(res.data.id);
        await setActiveStore(res.data);
        await refreshStoresForUser(user?.id);
        await refreshUser();

        Alert.alert(
          'Store Setup Complete!',
          `Store "${storeName}" has been created with its own isolated database instance.`,
          [
            {
              text: 'Open POS Catalog',
              onPress: () => {
                router.replace('/(protected)' as any);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to create store branch');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to initialize store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Banner */}
        <View style={styles.header}>
          <View style={[styles.stepBadge, { backgroundColor: theme.primary + '20' }]}>
            <Store size={16} color={theme.primary} />
            <Text style={[styles.stepBadgeText, { color: theme.primary }]}>STORE SETUP & BRANCH ISOLATION</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Configure Store Branch</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Set up branch branding, location, and currency. Each store has an isolated SQLite database.
          </Text>
        </View>

        {/* Store Setup Form */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Logo Picker Section */}
          <View style={styles.logoSection}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.logoPicker,
                { backgroundColor: theme.input, borderColor: theme.inputBorder },
              ]}
              onPress={handlePickLogo}
            >
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Camera size={24} color={theme.primary} />
                  <Text style={[styles.logoText, { color: theme.textSecondary }]}>Add Logo</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.logoTitle, { color: theme.text }]}>Store / Branch Logo</Text>
              <Text style={[styles.logoSubtext, { color: theme.textSecondary }]}>
                Optional: Appears on digital receipts and customer orders.
              </Text>
            </View>
          </View>

          {/* Store Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Branch / Store Name <Text style={{ color: theme.error }}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Store size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. Downtown Central Branch"
                placeholderTextColor={theme.textTertiary}
                value={storeName}
                onChangeText={setStoreName}
              />
            </View>
          </View>

          {/* Store Location */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Store Address & Location</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <MapPin size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. Mall Grand Avenue, Level 2"
                placeholderTextColor={theme.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Store Phone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Store Phone / WhatsApp</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Phone size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. +62 821 9876 5432"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Primary Currency Chips */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Primary Operating Currency</Text>
            <View style={styles.currencyRow}>
              {['IDR', 'USD', 'EUR', 'MYR', 'SGD'].map((curCode) => {
                const isSelected = selectedCurrency === curCode;
                return (
                  <TouchableOpacity
                    key={curCode}
                    style={[
                      styles.currencyChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.input,
                        borderColor: isSelected ? theme.primary : theme.inputBorder,
                      },
                    ]}
                    onPress={() => setSelectedCurrency(curCode)}
                  >
                    <Text
                      style={[
                        styles.currencyChipText,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {curCode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Submit */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleCreateStore}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Rocket size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Initialize Store & Enter POS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  logoPicker: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logoText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  logoSubtext: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
