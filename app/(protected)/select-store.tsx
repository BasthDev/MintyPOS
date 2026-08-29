import { useAuth } from '@/constants/auth';
import { useTheme } from '@/constants/colorTheme';
import { useStoreContext } from '@/constants/storeContext';
import { initDatabase } from '@/lib/database';
import { StoreProcess } from '@/processes/storeProcess';
import { StoreRecord, StoreService } from '@/services/storeService';
import { router } from 'expo-router';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Coins,
  MapPin,
  Plus,
  Radio,
  Sparkles,
  Store,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SelectStoreScreen() {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { activeStore, stores, refreshStores, setActiveStore } = useStoreContext();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshStores();
  }, []);

  const handleSelectStore = async (store: StoreRecord) => {
    setLoading(true);
    try {
      // 1. Switch active store in context & storage
      await setActiveStore(store);

      // 2. Initialize / connect to isolated SQLite database for this store
      await initDatabase(store.id);
      await refreshUser();

      // 3. Navigate into main POS workspace
      router.replace('/(protected)' as any);
    } catch (e: any) {
      Alert.alert('Store Switch Failed', e?.message || 'Unable to open store database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
            <Store size={16} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>MULTI-STORE SWITCHER</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Select Store Branch</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose the store location you want to operate. Each branch has an isolated inventory and sales ledger.
          </Text>
        </View>

        {/* Store List */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {stores.map((s) => {
            const isActive = activeStore?.id === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.7}
                style={[
                  styles.storeCard,
                  {
                    backgroundColor: isActive ? theme.primary + '10' : theme.card,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleSelectStore(s)}
                disabled={loading}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.storeIconBadge, { backgroundColor: isActive ? theme.primary : theme.input }]}>
                    <Store size={22} color={isActive ? '#FFFFFF' : theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.storeName, { color: theme.text }]}>{s.name}</Text>
                      {isActive && (
                        <View style={[styles.activeTag, { backgroundColor: theme.primary }]}>
                          <Text style={styles.activeTagText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    {s.address ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <MapPin size={12} color={theme.textSecondary} />
                        <Text style={[styles.storeMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                          {s.address}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <ChevronRight size={20} color={isActive ? theme.primary : theme.textTertiary} />
                </View>
              </TouchableOpacity>
            );
          })}

          {stores.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Store size={40} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Stores Found</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                You have not registered any store branch yet.
              </Text>
            </View>
          )}
        </View>

        {/* Add New Branch Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.addBtn, { backgroundColor: theme.input, borderColor: theme.border }]}
          onPress={() => router.push('/(protected)/setup-store' as any)}
        >
          <Plus size={18} color={theme.primary} />
          <Text style={[styles.addBtnText, { color: theme.text }]}>Create New Store Branch</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
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
  storeCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
  },
  storeMeta: {
    fontSize: 12,
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  addBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
